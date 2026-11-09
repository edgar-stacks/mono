import { z } from 'zod';

import { featureSessions } from '../feature-map/feature-entry.js';

export const verifyAccountTypes = ['software', 'ledger', 'mixed', 'policy'] as const;
export type VerifyAccountType = (typeof verifyAccountTypes)[number];

export const verifyVerdicts = ['verified', 'usage', 'ready-not-met', 'errors', 'env'] as const;
export type VerifyVerdict = (typeof verifyVerdicts)[number];

export const verifyExitCodes: Readonly<Record<VerifyVerdict, number>> = {
  verified: 0,
  usage: 1,
  'ready-not-met': 2,
  errors: 3,
  env: 4,
};

export const verifyDefaultNetwork = 'mainnet';
export const verifyDefaultAccountType: VerifyAccountType = 'software';
export const verifyDefaultStateSlices = ['active', 'networks', 'wallets'] as const;
export const verifyDefaultTimeoutMs = 30_000;
export const verifyBackgroundErrorsKey = 'verify:backgroundErrors';
export const verifyBackgroundErrorsLimit = 100;
export const verifyTestAppOrigin = 'http://localhost:3000';

export const verifyArtifacts = {
  screenshot: 'screenshot.png',
  a11y: 'a11y.md',
  console: 'console.json',
  network: 'network.json',
  backgroundErrors: 'background-errors.json',
  state: 'state.json',
  rpcRequest: 'rpc-request.json',
  summary: 'summary.json',
} as const;

const verifyMocksSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('none') }),
  z.object({ mode: z.literal('list'), names: z.array(z.string()) }),
]);
export type VerifyMocks = z.infer<typeof verifyMocksSchema>;

const verifyRpcSchema = z.object({
  method: z.string().min(1),
  catalogId: z.string().optional(),
  params: z.unknown().optional(),
  hasParams: z.boolean(),
});
export type VerifyRpc = z.infer<typeof verifyRpcSchema>;

export const verifyRunSchema = z.object({
  label: z.string().min(1),
  featureId: z.string().optional(),
  path: z.string(),
  open: z.array(z.string()),
  session: z.enum(featureSessions),
  accountType: z.enum(verifyAccountTypes),
  network: z.string().min(1),
  flags: z.record(z.string(), z.boolean()),
  mocks: verifyMocksSchema,
  ready: z.string().min(1),
  rpc: verifyRpcSchema.optional(),
  stateSlices: z.array(z.string()),
  connectTestApp: z.boolean(),
  allowConsoleErrors: z.boolean(),
  outDir: z.string().min(1),
  timeoutMs: z.number().int().positive(),
});
export type VerifyRun = z.infer<typeof verifyRunSchema>;

export const verifyEnvKeys = {
  run: 'VERIFY_RUN',
  label: 'VERIFY_LABEL',
  feature: 'VERIFY_FEATURE',
  path: 'VERIFY_PATH',
  open: 'VERIFY_OPEN',
  session: 'VERIFY_SESSION',
  accountType: 'VERIFY_ACCOUNT_TYPE',
  network: 'VERIFY_NETWORK',
  flags: 'VERIFY_FLAGS',
  mocks: 'VERIFY_MOCKS',
  ready: 'VERIFY_READY',
  rpcMethod: 'VERIFY_RPC_METHOD',
  rpcCatalogId: 'VERIFY_RPC_CATALOG_ID',
  rpcParams: 'VERIFY_RPC_PARAMS',
  state: 'VERIFY_STATE',
  connectTestApp: 'VERIFY_CONNECT_TEST_APP',
  allowConsoleErrors: 'VERIFY_ALLOW_CONSOLE_ERRORS',
  out: 'VERIFY_OUT',
  timeout: 'VERIFY_TIMEOUT',
} as const;

const enabledValue = '1';
const listSeparator = ',';
const noMocksValue = 'none';

function joinList(items: readonly string[]): string {
  return items.join(listSeparator);
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(listSeparator)
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

export function formatFlags(flags: Readonly<Record<string, boolean>>): string {
  return joinList(Object.entries(flags).map(([name, value]) => `${name}=${String(value)}`));
}

type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

const flagAssignmentPattern = /^([A-Za-z0-9_]+)=(true|false)$/;

export function parseFlags(value: string | undefined): ParseResult<Record<string, boolean>> {
  const flags: Record<string, boolean> = {};
  for (const item of splitList(value)) {
    const match = flagAssignmentPattern.exec(item);
    if (!match?.[1]) {
      return { ok: false, error: `flag '${item}' must look like name=true or name=false` };
    }
    flags[match[1]] = match[2] === 'true';
  }
  return { ok: true, value: flags };
}

export function toVerifyEnv(run: VerifyRun): Record<string, string> {
  const env: Record<string, string> = {
    [verifyEnvKeys.run]: enabledValue,
    [verifyEnvKeys.label]: run.label,
    [verifyEnvKeys.path]: run.path,
    [verifyEnvKeys.open]: joinList(run.open),
    [verifyEnvKeys.session]: run.session,
    [verifyEnvKeys.accountType]: run.accountType,
    [verifyEnvKeys.network]: run.network,
    [verifyEnvKeys.flags]: formatFlags(run.flags),
    [verifyEnvKeys.mocks]: run.mocks.mode === 'none' ? noMocksValue : joinList(run.mocks.names),
    [verifyEnvKeys.ready]: run.ready,
    [verifyEnvKeys.state]: joinList(run.stateSlices),
    [verifyEnvKeys.connectTestApp]: String(run.connectTestApp),
    [verifyEnvKeys.allowConsoleErrors]: String(run.allowConsoleErrors),
    [verifyEnvKeys.out]: run.outDir,
    [verifyEnvKeys.timeout]: String(run.timeoutMs),
  };
  if (run.featureId) env[verifyEnvKeys.feature] = run.featureId;
  if (run.rpc) {
    env[verifyEnvKeys.rpcMethod] = run.rpc.method;
    if (run.rpc.catalogId) env[verifyEnvKeys.rpcCatalogId] = run.rpc.catalogId;
    if (run.rpc.hasParams) env[verifyEnvKeys.rpcParams] = JSON.stringify(run.rpc.params ?? null);
  }
  return env;
}

export function isVerifyRunEnabled(env: Readonly<Record<string, string | undefined>>): boolean {
  return env[verifyEnvKeys.run] === enabledValue;
}

function parseJson(text: string): ParseResult<unknown> {
  try {
    const value: unknown = JSON.parse(text);
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function readRpc(env: Readonly<Record<string, string | undefined>>): ParseResult<unknown> {
  const method = env[verifyEnvKeys.rpcMethod];
  if (!method) return { ok: true, value: undefined };
  const paramsText = env[verifyEnvKeys.rpcParams];
  const params = paramsText === undefined ? undefined : parseJson(paramsText);
  if (params && !params.ok) {
    return { ok: false, error: `${verifyEnvKeys.rpcParams} is not JSON: ${params.error}` };
  }
  return {
    ok: true,
    value: {
      method,
      catalogId: env[verifyEnvKeys.rpcCatalogId],
      params: params?.value,
      hasParams: params !== undefined,
    },
  };
}

export function parseVerifyEnv(
  env: Readonly<Record<string, string | undefined>>
): ParseResult<VerifyRun> {
  if (!isVerifyRunEnabled(env)) {
    return { ok: false, error: `${verifyEnvKeys.run} is not ${enabledValue}` };
  }
  const flags = parseFlags(env[verifyEnvKeys.flags]);
  if (!flags.ok) return flags;
  const rpc = readRpc(env);
  if (!rpc.ok) return rpc;
  const mocksValue = env[verifyEnvKeys.mocks];
  const candidate = {
    label: env[verifyEnvKeys.label],
    featureId: env[verifyEnvKeys.feature],
    path: env[verifyEnvKeys.path] ?? '/',
    open: splitList(env[verifyEnvKeys.open]),
    session: env[verifyEnvKeys.session],
    accountType: env[verifyEnvKeys.accountType],
    network: env[verifyEnvKeys.network],
    flags: flags.value,
    mocks:
      mocksValue === noMocksValue
        ? { mode: 'none' }
        : { mode: 'list', names: splitList(mocksValue) },
    ready: env[verifyEnvKeys.ready],
    rpc: rpc.value,
    stateSlices: splitList(env[verifyEnvKeys.state]),
    connectTestApp: env[verifyEnvKeys.connectTestApp] === 'true',
    allowConsoleErrors: env[verifyEnvKeys.allowConsoleErrors] === 'true',
    outDir: env[verifyEnvKeys.out],
    timeoutMs: Number(env[verifyEnvKeys.timeout] ?? verifyDefaultTimeoutMs),
  };
  const parsed = verifyRunSchema.safeParse(candidate);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
    return { ok: false, error: `invalid VERIFY_* environment: ${issues.join('; ')}` };
  }
  return { ok: true, value: parsed.data };
}

export interface VerdictInput {
  readonly readyMet: boolean;
  readonly rpcErrorBeforeApprover?: string;
  readonly unexpectedConsoleErrors: number;
  readonly backgroundErrors: number;
  readonly realRequests: number;
  readonly unappliedMocks: readonly string[];
  readonly mocksNone: boolean;
}

export interface VerdictDecision {
  readonly verdict: VerifyVerdict;
  readonly reasons: readonly string[];
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function decideVerdict(input: VerdictInput): VerdictDecision {
  const errors: string[] = [];
  if (input.rpcErrorBeforeApprover !== undefined) {
    errors.push(`rpc request failed before an approver opened: ${input.rpcErrorBeforeApprover}`);
  }
  if (input.unexpectedConsoleErrors > 0) {
    errors.push(
      `${plural(input.unexpectedConsoleErrors, 'page or console error')} not in the console allowlist`
    );
  }
  if (input.backgroundErrors > 0) {
    errors.push(`${plural(input.backgroundErrors, 'background error')} recorded`);
  }
  if (!input.mocksNone && input.realRequests > 0) {
    errors.push(`${plural(input.realRequests, 'request')} reached the real network under mocks`);
  }
  if (input.unappliedMocks.length > 0) {
    errors.push(`mock registry cannot apply: ${input.unappliedMocks.join(', ')}`);
  }
  const readyReasons = input.readyMet ? [] : ['ready selector never appeared'];
  if (input.rpcErrorBeforeApprover !== undefined) {
    return { verdict: 'errors', reasons: [...errors, ...readyReasons] };
  }
  if (!input.readyMet) return { verdict: 'ready-not-met', reasons: [...readyReasons, ...errors] };
  if (errors.length > 0) return { verdict: 'errors', reasons: errors };
  return { verdict: 'verified', reasons: [] };
}

export const verifySummarySchema = z.looseObject({
  verdict: z.enum(verifyVerdicts),
  exitCode: z.number().int(),
  label: z.string(),
  reasons: z.array(z.string()),
});
export type VerifySummaryHead = z.infer<typeof verifySummarySchema>;

export function makeEnvSummary(label: string, reasons: readonly string[]): VerifySummaryHead {
  return { verdict: 'env', exitCode: verifyExitCodes.env, label, reasons: [...reasons] };
}
