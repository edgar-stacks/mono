import { z } from 'zod';

import { approvalAssetSymbols } from '../scenarios/approval-assets';
import {
  type ResolvedJourney,
  createsTransaction,
  needsDeviceSignature,
} from './journey-definitions';

const journeyPhases = [
  'app',
  'review',
  'device',
  'pending',
  'signed',
  'connected',
  'confirmed',
  'failed',
  'rejected',
] as const;

export const journeyOutcomes = ['success', 'pre-broadcast-failure', 'on-chain-failure'] as const;

export type JourneyOutcome = (typeof journeyOutcomes)[number];

const assetAmountSchema = z.object({
  asset: z.enum(approvalAssetSymbols),
  baseUnits: z.number().int(),
});

const movementSchema = z.object({
  direction: z.enum(['out', 'in']),
  amount: assetAmountSchema,
  counterparty: z.string().optional(),
});

const transactionSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  accountId: z.string(),
  status: z.enum(['pending', 'confirmed', 'failed']),
  movements: z.array(movementSchema),
  fee: assetAmountSchema.nullable(),
  feeCharged: z.boolean(),
  title: z.string(),
  caption: z.string(),
});

export type JourneyTransaction = z.infer<typeof transactionSchema>;

const planSchema = z.object({
  kind: z.string(),
  accountId: z.string(),
  createsTransaction: z.boolean(),
  needsDevice: z.boolean(),
  movements: z.array(movementSchema),
  fee: assetAmountSchema.nullable(),
  title: z.string(),
  caption: z.string(),
});

const journeyRunSchema = z.object({
  runId: z.string().min(1),
  familyId: z.string(),
  variantId: z.string(),
  wallet: z.enum(['software', 'ledger']),
  revision: z.number().int().nonnegative(),
  requestId: z.string().nullable(),
  phase: z.enum(journeyPhases),
  outcome: z.enum(journeyOutcomes),
  signed: z.boolean(),
  deviceRejected: z.boolean(),
  failure: z.enum(['pre-broadcast', 'on-chain']).nullable(),
  plan: planSchema,
  transactions: z.array(transactionSchema),
});

export type JourneyRun = z.infer<typeof journeyRunSchema>;

interface JourneyRequestKey {
  runId: string;
  revision: number;
  requestId: string;
}

export type JourneyAction =
  | { type: 'open'; runId: string }
  | { type: 'set-outcome'; runId: string; outcome: JourneyOutcome }
  | ({
      type: 'amend' | 'approve' | 'device-approve' | 'device-reject' | 'cancel' | 'retry';
    } & JourneyRequestKey)
  | ({ type: 'settle'; transactionId: string } & JourneyRequestKey);

export function createJourneyRun(runId: string, journey: ResolvedJourney): JourneyRun {
  const { family, variant, wallet, request } = journey;
  return {
    runId,
    familyId: family.id,
    variantId: variant.id,
    wallet,
    revision: 0,
    requestId: null,
    phase: 'app',
    outcome: 'success',
    signed: false,
    deviceRejected: false,
    failure: null,
    plan: {
      kind: request.kind,
      accountId: request.account.id,
      createsTransaction: createsTransaction(request),
      needsDevice: needsDeviceSignature(request),
      movements: variant.outcome.movements,
      fee: request.fee?.amount ?? null,
      title: variant.outcome.activityTitle,
      caption: variant.outcome.activityCaption,
    },
    transactions: [],
  };
}

export function parseJourneyRun(value: unknown) {
  const result = journeyRunSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function isJourneyRun(value: unknown) {
  return parseJourneyRun(value) !== null;
}

export function parseJourneyTransactions(value: unknown) {
  const result = z.array(transactionSchema).safeParse(value);
  return result.success ? result.data : [];
}

export function journeyRequestKey(run: JourneyRun): JourneyRequestKey | null {
  if (run.requestId === null) return null;
  return { runId: run.runId, revision: run.revision, requestId: run.requestId };
}

export function pendingTransaction(run: JourneyRun) {
  return run.transactions.find(
    transaction => transaction.requestId === run.requestId && transaction.status === 'pending'
  );
}

function isCurrentRequest(run: JourneyRun, key: JourneyRequestKey) {
  return key.revision === run.revision && key.requestId === run.requestId;
}

function nextRequest(run: JourneyRun): JourneyRun {
  const revision = run.revision + 1;
  return {
    ...run,
    revision,
    requestId: `${run.runId}:${revision}`,
    phase: 'review',
    signed: false,
    deviceRejected: false,
    failure: null,
  };
}

function submit(run: JourneyRun): JourneyRun {
  if (!run.plan.createsTransaction) return { ...run, phase: 'signed' };
  if (run.outcome === 'pre-broadcast-failure') {
    return { ...run, phase: 'failed', failure: 'pre-broadcast' };
  }
  const requestId = run.requestId ?? run.runId;
  const transaction: JourneyTransaction = {
    id: `${requestId}:tx`,
    requestId,
    accountId: run.plan.accountId,
    status: 'pending',
    movements: run.plan.movements,
    fee: run.plan.fee,
    feeCharged: false,
    title: run.plan.title,
    caption: run.plan.caption,
  };
  return {
    ...run,
    phase: 'pending',
    failure: null,
    transactions: [...run.transactions, transaction],
  };
}

function settle(run: JourneyRun, transactionId: string): JourneyRun {
  const pending = pendingTransaction(run);
  if (!pending || pending.id !== transactionId) return run;
  const failed = run.outcome === 'on-chain-failure';
  const settled: JourneyTransaction = {
    ...pending,
    status: failed ? 'failed' : 'confirmed',
    feeCharged: true,
  };
  return {
    ...run,
    phase: failed ? 'failed' : 'confirmed',
    failure: failed ? 'on-chain' : null,
    transactions: run.transactions.map(transaction =>
      transaction.id === settled.id ? settled : transaction
    ),
  };
}

function approve(run: JourneyRun): JourneyRun {
  if (run.plan.kind === 'connect') return { ...run, phase: 'connected' };
  if (run.plan.needsDevice && !run.signed) return { ...run, phase: 'device' };
  return submit({ ...run, signed: true });
}

export function reduceJourneyRun(run: JourneyRun, action: JourneyAction): JourneyRun {
  if (action.runId !== run.runId) return run;

  switch (action.type) {
    case 'open':
      return run.phase === 'app' || run.phase === 'rejected' ? nextRequest(run) : run;
    case 'set-outcome':
      return run.phase === 'pending' || run.phase === 'failed'
        ? run
        : { ...run, outcome: action.outcome };
    case 'amend':
      if (!isCurrentRequest(run, action)) return run;
      return run.phase === 'review' || run.phase === 'device' ? nextRequest(run) : run;
    case 'approve':
      if (!isCurrentRequest(run, action) || run.phase !== 'review') return run;
      return approve(run);
    case 'device-approve':
      if (!isCurrentRequest(run, action) || run.phase !== 'device') return run;
      return submit({ ...run, signed: true, deviceRejected: false });
    case 'device-reject':
      if (!isCurrentRequest(run, action) || run.phase !== 'device') return run;
      return { ...run, phase: 'review', deviceRejected: true };
    case 'cancel':
      if (!isCurrentRequest(run, action)) return run;
      return run.phase === 'review' || run.phase === 'device' ? { ...run, phase: 'rejected' } : run;
    case 'retry':
      if (!isCurrentRequest(run, action) || run.failure !== 'pre-broadcast') return run;
      return submit({ ...run, outcome: 'success' });
    case 'settle':
      if (!isCurrentRequest(run, action) || run.phase !== 'pending') return run;
      return settle(run, action.transactionId);
    default:
      return run;
  }
}
