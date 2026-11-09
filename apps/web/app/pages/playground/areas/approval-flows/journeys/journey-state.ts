import { z } from 'zod';

import {
  type JourneyRequest,
  requestNeedsTransaction,
  resolveJourney,
} from './journey-definitions';
import {
  type JourneyOutcome,
  journeyAccountIds,
  journeyAssetIds,
  journeyWalletKinds,
} from './journey-world';

const journeyStages = [
  'idle',
  'reviewing',
  'awaiting-device',
  'broadcasting',
  'pending',
  'confirmed',
  'signed',
  'connected',
  'failed',
  'cancelled',
] as const;

export type JourneyStage = (typeof journeyStages)[number];

const movementSchema = z.object({
  asset: z.enum(journeyAssetIds),
  amount: z.number().int(),
});

const outcomeSchema = z.object({
  requestId: z.number().int().positive(),
  accountId: z.enum(journeyAccountIds),
  feePayer: z.enum(journeyAccountIds),
  title: z.string(),
  status: z.enum(['confirmed', 'failed']),
  movements: z.array(movementSchema),
  fee: movementSchema.nullable(),
});

const journeyRunSchema = z.object({
  runId: z.string().min(1),
  journeyId: z.string().min(1),
  variantId: z.string().min(1),
  wallet: z.enum(journeyWalletKinds),
  revision: z.number().int().nonnegative(),
  requestId: z.number().int().positive().nullable(),
  nextRequestId: z.number().int().positive(),
  stage: z.enum(journeyStages),
  isPayloadSigned: z.boolean(),
  failure: z.enum(['pre-broadcast', 'submitted']).nullable(),
  outcomes: z.array(outcomeSchema),
});

export type JourneyRun = z.infer<typeof journeyRunSchema>;

export type JourneyFailure = NonNullable<JourneyRun['failure']>;

export function parseJourneyRun(value: unknown): JourneyRun | null {
  return journeyRunSchema.safeParse(value).data ?? null;
}

export function isJourneyRun(value: unknown) {
  return parseJourneyRun(value) !== null;
}

interface JourneyRequestRef {
  runId: string;
  revision: number;
  requestId: number;
}

export type JourneyEvent =
  | { type: 'open-request'; runId: string; revision: number }
  | ({ type: 'approve' } & JourneyRequestRef)
  | ({ type: 'cancel' } & JourneyRequestRef)
  | ({ type: 'device-approve' } & JourneyRequestRef)
  | ({ type: 'device-reject' } & JourneyRequestRef)
  | ({ type: 'submitted' } & JourneyRequestRef)
  | ({ type: 'confirm' } & JourneyRequestRef)
  | ({ type: 'fail' } & JourneyRequestRef)
  | ({ type: 'retry' } & JourneyRequestRef);

interface CreateJourneyRunInput {
  runId: string;
  journeyId: string;
  variantId: string;
  wallet: JourneyRun['wallet'];
}

export function createJourneyRun({
  runId,
  journeyId,
  variantId,
  wallet,
}: CreateJourneyRunInput): JourneyRun {
  return {
    runId,
    journeyId,
    variantId,
    wallet,
    revision: 0,
    requestId: null,
    nextRequestId: 1,
    stage: 'idle',
    isPayloadSigned: false,
    failure: null,
    outcomes: [],
  };
}

const openableStages: JourneyStage[] = [
  'idle',
  'confirmed',
  'signed',
  'connected',
  'failed',
  'cancelled',
];

export function isRequestOpen(run: JourneyRun) {
  return !openableStages.includes(run.stage);
}

function getJourneyRequest(run: JourneyRun) {
  return resolveJourney(run.journeyId, run.variantId).variant.request;
}

function advance(run: JourneyRun, changes: Partial<JourneyRun>): JourneyRun {
  return { ...run, ...changes, revision: run.revision + 1 };
}

function settledStage(request: JourneyRequest): JourneyStage {
  if (request.kind === 'connect') return 'connected';
  if (requestNeedsTransaction(request)) return 'broadcasting';
  return 'signed';
}

function needsDevice(run: JourneyRun, request: JourneyRequest) {
  return run.wallet === 'ledger' && request.kind !== 'connect';
}

function createOutcome(
  requestId: number,
  request: JourneyRequest,
  status: JourneyOutcome['status']
): JourneyOutcome {
  return {
    requestId,
    accountId: request.accountId,
    feePayer: request.feePayer,
    title: request.activityTitle,
    status,
    movements: status === 'confirmed' ? request.movements : [],
    fee: request.fee,
  };
}

function isCurrentRequest(run: JourneyRun, event: JourneyRequestRef) {
  return (
    event.runId === run.runId &&
    event.revision === run.revision &&
    event.requestId === run.requestId
  );
}

export function reduceJourneyRun(run: JourneyRun, event: JourneyEvent): JourneyRun {
  const request = getJourneyRequest(run);

  if (event.type === 'open-request') {
    if (event.runId !== run.runId || event.revision !== run.revision) return run;
    if (isRequestOpen(run)) return run;
    return advance(run, {
      requestId: run.nextRequestId,
      nextRequestId: run.nextRequestId + 1,
      stage: 'reviewing',
      isPayloadSigned: false,
      failure: null,
    });
  }

  if (!isCurrentRequest(run, event) || run.requestId === null) return run;
  const requestId = run.requestId;

  switch (event.type) {
    case 'approve':
      if (run.stage !== 'reviewing') return run;
      if (needsDevice(run, request)) return advance(run, { stage: 'awaiting-device' });
      return advance(run, {
        stage: settledStage(request),
        isPayloadSigned: request.kind !== 'connect',
      });
    case 'device-approve':
      if (run.stage !== 'awaiting-device') return run;
      return advance(run, { stage: settledStage(request), isPayloadSigned: true });
    case 'device-reject':
      if (run.stage !== 'awaiting-device') return run;
      return advance(run, { stage: 'reviewing' });
    case 'cancel':
      if (run.stage !== 'reviewing' && run.stage !== 'awaiting-device') return run;
      return advance(run, { stage: 'cancelled' });
    case 'submitted':
      if (run.stage !== 'broadcasting') return run;
      return advance(run, { stage: 'pending' });
    case 'confirm':
      if (run.stage !== 'pending') return run;
      return advance(run, {
        stage: 'confirmed',
        outcomes: [...run.outcomes, createOutcome(requestId, request, 'confirmed')],
      });
    case 'fail':
      if (run.stage === 'broadcasting') {
        return advance(run, { stage: 'failed', failure: 'pre-broadcast' });
      }
      if (run.stage === 'pending') {
        return advance(run, {
          stage: 'failed',
          failure: 'submitted',
          outcomes: [...run.outcomes, createOutcome(requestId, request, 'failed')],
        });
      }
      return run;
    case 'retry':
      if (run.stage !== 'failed' || run.failure !== 'pre-broadcast') return run;
      return advance(run, {
        stage: run.isPayloadSigned ? 'broadcasting' : 'reviewing',
        failure: null,
      });
    default:
      return run;
  }
}
