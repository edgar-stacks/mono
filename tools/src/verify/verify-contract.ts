import { z } from 'zod';

export const verifyRunEnvVar = 'VERIFY_RUN';
export const verifyPlanEnvVar = 'VERIFY_PLAN';
export const verifyOutDirEnvVar = 'VERIFY_OUT_DIR';

export const backgroundErrorsStorageKey = 'verify:backgroundErrors';

export const verifyAccountTypes = ['software', 'ledger', 'mixed', 'policy'] as const;
export type VerifyAccountType = (typeof verifyAccountTypes)[number];

export const verifySessions = ['signed-in', 'signed-out', 'locked'] as const;
export type VerifySession = (typeof verifySessions)[number];

export const verifyMocksModes = ['default', 'none', 'list'] as const;
export type VerifyMocksMode = (typeof verifyMocksModes)[number];

export const verifyParamsSources = ['catalog', 'file', 'none'] as const;

export const verifyExitCodes = {
  verified: 0,
  usage: 1,
  'ready-not-met': 2,
  errors: 3,
  env: 4,
} as const;
export type VerifyVerdict = keyof typeof verifyExitCodes;
const verifyVerdicts = ['verified', 'usage', 'ready-not-met', 'errors', 'env'] as const;

export const defaultVerifyTimeoutMs = 30_000;

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

const verifyRpcSchema = z.object({
  method: z.string().min(1),
  catalogId: z.string().optional(),
  paramsSource: z.enum(verifyParamsSources),
  params: z.unknown().optional(),
});
export type VerifyRpc = z.infer<typeof verifyRpcSchema>;

export const verifyPlanSchema = z.object({
  label: z.string().min(1),
  featureId: z.string().optional(),
  route: z.string().min(1),
  open: z.array(z.string()),
  session: z.enum(verifySessions),
  accountType: z.enum(verifyAccountTypes),
  network: z.string().min(1),
  flags: z.record(z.string(), z.boolean()),
  mocksMode: z.enum(verifyMocksModes),
  mocks: z.array(z.string()),
  ready: z.string().min(1),
  rpc: verifyRpcSchema.optional(),
  stateSlices: z.array(z.string()),
  connectTestApp: z.boolean(),
  allowConsoleErrors: z.boolean(),
  timeoutMs: z.number().int().positive(),
});
export type VerifyPlan = z.infer<typeof verifyPlanSchema>;

export const verifySummarySchema = z.object({
  verdict: z.enum(verifyVerdicts),
  exitCode: z.number().int(),
  label: z.string(),
  featureId: z.string().optional(),
  ready: z.string(),
  readyMet: z.boolean(),
  reasons: z.array(z.string()),
  artifacts: z.array(z.string()),
  startedAt: z.string(),
  durationMs: z.number(),
  plan: verifyPlanSchema,
});
export type VerifySummary = z.infer<typeof verifySummarySchema>;

export function verifyPlanEnv(plan: VerifyPlan, outDir: string): Record<string, string> {
  return {
    [verifyRunEnvVar]: '1',
    [verifyPlanEnvVar]: JSON.stringify(plan),
    [verifyOutDirEnvVar]: outDir,
  };
}

type VerifyEnvResult =
  | { readonly ok: true; readonly plan: VerifyPlan; readonly outDir: string }
  | { readonly ok: false; readonly error: string };

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function readVerifyPlanEnv(
  env: Readonly<Record<string, string | undefined>>
): VerifyEnvResult {
  if (env[verifyRunEnvVar] !== '1') {
    return {
      ok: false,
      error: `${verifyRunEnvVar} is not 1; run it through pnpm lt verify extension`,
    };
  }
  const outDir = env[verifyOutDirEnvVar];
  if (!outDir) return { ok: false, error: `${verifyOutDirEnvVar} is not set` };
  const raw = env[verifyPlanEnvVar];
  if (!raw) return { ok: false, error: `${verifyPlanEnvVar} is not set` };
  const parsed = verifyPlanSchema.safeParse(parseJson(raw));
  if (!parsed.success) {
    return { ok: false, error: `${verifyPlanEnvVar} is not a valid plan: ${parsed.error.message}` };
  }
  return { ok: true, plan: parsed.data, outDir };
}

interface VerdictInput {
  readonly envErrors: readonly string[];
  readonly errors: readonly string[];
  readonly readyMet: boolean;
}

export function decideVerdict({ envErrors, errors, readyMet }: VerdictInput): VerifyVerdict {
  if (envErrors.length > 0) return 'env';
  if (errors.length > 0) return 'errors';
  if (!readyMet) return 'ready-not-met';
  return 'verified';
}

export function parseVerifySummary(text: string): VerifySummary | undefined {
  const parsed = verifySummarySchema.safeParse(parseJson(text));
  return parsed.success ? parsed.data : undefined;
}
