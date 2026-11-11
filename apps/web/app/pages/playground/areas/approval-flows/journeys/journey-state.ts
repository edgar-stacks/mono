import { z } from 'zod';

import { demoAssetSymbols } from '../scenarios/approval-assets';
import {
  type ApprovalRequest,
  type SignerKind,
  createsTransaction,
  needsDeviceSignature,
} from '../scenarios/approval-model';
import { findJourney, findVariant } from './journey-definitions';
import { createJourneyWorld, settleRequest } from './journey-world';

const stageValues = [
  'idle',
  'review',
  'device',
  'signing',
  'broadcasting',
  'pending',
  'confirmed',
  'signed',
  'connected',
  'failed',
  'cancelled',
] as const;

export type JourneyStage = (typeof stageValues)[number];

const outcomeValues = ['success', 'broadcast-failure', 'chain-failure'] as const;

export type JourneyOutcome = (typeof outcomeValues)[number];

const portfolioSchema = z.partialRecord(z.enum(demoAssetSymbols), z.number());

const journeyRunSchema = z.object({
  version: z.literal(1),
  runId: z.string().min(1),
  journeyId: z.string(),
  variantId: z.string(),
  wallet: z.enum(['software', 'ledger']),
  stage: z.enum(stageValues),
  outcome: z.enum(outcomeValues),
  request: z.object({ id: z.string(), revision: z.number().int().positive() }).nullable(),
  requestCount: z.number().int().nonnegative(),
  transactions: z.array(
    z.object({
      txid: z.string(),
      requestId: z.string(),
      status: z.enum(['pending', 'confirmed', 'failed']),
      feeCharged: z.boolean(),
    })
  ),
  failure: z
    .object({ phase: z.enum(['pre-broadcast', 'on-chain']), feeCharged: z.boolean() })
    .nullable(),
  cancelledOnDevice: z.boolean(),
  portfolios: z.object({ account: portfolioSchema, vault: portfolioSchema }),
  events: z.array(z.object({ type: z.string(), stage: z.enum(stageValues) })),
});

export type JourneyRun = z.infer<typeof journeyRunSchema>;

export type JourneyTransaction = JourneyRun['transactions'][number];

export function isJourneyRun(value: unknown) {
  return journeyRunSchema.safeParse(value).success;
}

export function parseJourneyRun(value: unknown): JourneyRun | null {
  const result = journeyRunSchema.safeParse(value);
  return result.success ? result.data : null;
}

interface RunScope {
  runId: string;
}

interface RequestScope extends RunScope {
  requestId: string;
}

export type JourneyAction =
  | ({ type: 'request' } & RunScope)
  | ({ type: 'revise' } & RequestScope)
  | ({ type: 'approve'; revision: number } & RequestScope)
  | ({ type: 'device-approve' } & RequestScope)
  | ({ type: 'device-reject' } & RequestScope)
  | ({ type: 'cancel' } & RequestScope)
  | ({ type: 'signed' } & RequestScope)
  | ({ type: 'broadcast-accepted' } & RequestScope)
  | ({ type: 'broadcast-rejected' } & RequestScope)
  | ({ type: 'confirm' } & RequestScope)
  | ({ type: 'fail' } & RequestScope)
  | ({ type: 'set-outcome'; outcome: JourneyOutcome } & RunScope);

interface CreateJourneyRunInput {
  runId: string;
  journeyId: string;
  variantId: string;
  wallet: SignerKind;
}

export function createJourneyRun({
  runId,
  journeyId,
  variantId,
  wallet,
}: CreateJourneyRunInput): JourneyRun {
  return {
    version: 1,
    runId,
    journeyId,
    variantId,
    wallet,
    stage: 'idle',
    outcome: 'success',
    request: null,
    requestCount: 0,
    transactions: [],
    failure: null,
    cancelledOnDevice: false,
    portfolios: createJourneyWorld(wallet).portfolios,
    events: [],
  };
}

export function journeyRequest(run: Pick<JourneyRun, 'journeyId' | 'variantId' | 'wallet'>) {
  return findVariant(findJourney(run.journeyId), run.variantId).buildRequest(run.wallet);
}

function txidFor(requestId: string) {
  let hash = 0;
  for (const character of requestId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return `0x${hash.toString(16).padStart(8, '0')}${'0'.repeat(56)}`;
}

const restartableStages: JourneyStage[] = [
  'idle',
  'confirmed',
  'signed',
  'connected',
  'failed',
  'cancelled',
];

function isCurrentRequest(run: JourneyRun, action: RequestScope) {
  return run.request?.id === action.requestId;
}

function moveTo(
  run: JourneyRun,
  stage: JourneyStage,
  type: string,
  patch: Partial<JourneyRun> = {}
) {
  return { ...run, ...patch, stage, events: [...run.events, { type, stage }] };
}

function stageAfterApproval(request: ApprovalRequest): JourneyStage {
  if (request.kind === 'connect') return 'connected';
  if (needsDeviceSignature(request)) return 'device';
  if (request.alreadySigned) return 'broadcasting';
  return 'signing';
}

function updateTransaction(run: JourneyRun, requestId: string, patch: Partial<JourneyTransaction>) {
  return run.transactions.map(transaction =>
    transaction.requestId === requestId ? { ...transaction, ...patch } : transaction
  );
}

export function reduceJourneyRun(run: JourneyRun, action: JourneyAction): JourneyRun {
  if (action.runId !== run.runId) return run;

  if (action.type === 'set-outcome') return { ...run, outcome: action.outcome };

  if (action.type === 'request') {
    if (!restartableStages.includes(run.stage)) return run;
    const requestCount = run.requestCount + 1;
    return moveTo(run, 'review', action.type, {
      requestCount,
      request: { id: `${run.runId}:${requestCount}`, revision: 1 },
      failure: null,
      cancelledOnDevice: false,
    });
  }

  if (!isCurrentRequest(run, action) || !run.request) return run;
  const request = journeyRequest(run);

  switch (action.type) {
    case 'revise':
      if (run.stage !== 'review') return run;
      return moveTo(run, 'review', action.type, {
        request: { ...run.request, revision: run.request.revision + 1 },
      });
    case 'approve':
      if (run.stage !== 'review' || action.revision !== run.request.revision) return run;
      return moveTo(run, stageAfterApproval(request), action.type);
    case 'device-approve':
      if (run.stage !== 'device') return run;
      return moveTo(run, 'signing', action.type);
    case 'device-reject':
      if (run.stage !== 'device') return run;
      return moveTo(run, 'cancelled', action.type, { cancelledOnDevice: true });
    case 'cancel':
      if (run.stage !== 'review' && run.stage !== 'device') return run;
      return moveTo(run, 'cancelled', action.type);
    case 'signed':
      if (run.stage !== 'signing') return run;
      return moveTo(run, createsTransaction(request) ? 'broadcasting' : 'signed', action.type);
    case 'broadcast-accepted':
      if (run.stage !== 'broadcasting') return run;
      return moveTo(run, 'pending', action.type, {
        transactions: [
          ...run.transactions,
          {
            txid: txidFor(action.requestId),
            requestId: action.requestId,
            status: 'pending',
            feeCharged: false,
          },
        ],
      });
    case 'broadcast-rejected':
      if (run.stage !== 'broadcasting') return run;
      return moveTo(run, 'failed', action.type, {
        failure: { phase: 'pre-broadcast', feeCharged: false },
      });
    case 'confirm':
      if (run.stage !== 'pending') return run;
      return moveTo(run, 'confirmed', action.type, {
        transactions: updateTransaction(run, action.requestId, {
          status: 'confirmed',
          feeCharged: Boolean(request.fee),
        }),
        portfolios: settleRequest(run.portfolios, request, 'confirmed'),
      });
    case 'fail':
      if (run.stage !== 'pending') return run;
      return moveTo(run, 'failed', action.type, {
        transactions: updateTransaction(run, action.requestId, {
          status: 'failed',
          feeCharged: Boolean(request.fee),
        }),
        failure: { phase: 'on-chain', feeCharged: Boolean(request.fee) },
        portfolios: settleRequest(run.portfolios, request, 'failed-on-chain'),
      });
    default:
      return run;
  }
}
