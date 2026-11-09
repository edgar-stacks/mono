import { z } from 'zod';

export const verifyAccountTypes = ['software', 'ledger', 'mixed', 'policy'] as const;
export type VerifyAccountType = (typeof verifyAccountTypes)[number];

export const verifySessions = ['signed-in', 'signed-out', 'locked'] as const;
export type VerifySession = (typeof verifySessions)[number];

export const verifyVerdicts = ['verified', 'usage', 'ready-not-met', 'errors', 'env'] as const;
export type VerifyVerdict = (typeof verifyVerdicts)[number];

export const verifyExitCodes: Readonly<Record<VerifyVerdict, number>> = {
  verified: 0,
  usage: 1,
  'ready-not-met': 2,
  errors: 3,
  env: 4,
};

export const verifyFindingKinds = [
  'env',
  'rpc-error',
  'page-error',
  'console-error',
  'background-error',
  'real-request',
  'unapplied-mock',
  'ready-not-met',
] as const;
export type VerifyFindingKind = (typeof verifyFindingKinds)[number];

const findingVerdicts: Readonly<Record<VerifyFindingKind, VerifyVerdict>> = {
  env: 'env',
  'rpc-error': 'errors',
  'page-error': 'errors',
  'console-error': 'errors',
  'background-error': 'errors',
  'real-request': 'errors',
  'unapplied-mock': 'errors',
  'ready-not-met': 'ready-not-met',
};

const verdictPrecedence: readonly VerifyVerdict[] = ['env', 'errors', 'ready-not-met'];

export const verifyRunEnvVar = 'VERIFY_RUN';
export const verifyConfigEnvVar = 'VERIFY_CONFIG';

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

export const backgroundErrorsStorageKey = 'verify:backgroundErrors';

const openActionSchema = z.object({ className: z.string(), method: z.string() });

const rpcRunSchema = z.object({
  method: z.string(),
  catalogId: z.string().optional(),
  params: z.unknown().optional(),
  paramsSource: z.enum(['catalog', 'file', 'none']),
});

const verifyRunSchema = z.object({
  label: z.string(),
  feature: z.string().optional(),
  route: z.string(),
  open: z.array(openActionSchema),
  session: z.enum(verifySessions),
  accountType: z.enum(verifyAccountTypes),
  network: z.string(),
  flags: z.record(z.string(), z.boolean()),
  mocks: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('none') }),
    z.object({ mode: z.literal('list'), names: z.array(z.string()) }),
  ]),
  ready: z.string(),
  rpc: rpcRunSchema.optional(),
  stateSlices: z.array(z.string()),
  connectTestApp: z.boolean(),
  allowConsoleErrors: z.boolean(),
  outDir: z.string(),
  timeout: z.number().int().positive(),
});

export type VerifyOpenAction = z.infer<typeof openActionSchema>;
export type VerifyRpcRun = z.infer<typeof rpcRunSchema>;
export type VerifyRun = z.infer<typeof verifyRunSchema>;

export function verifyRunToEnv(run: VerifyRun): Record<string, string> {
  return { [verifyRunEnvVar]: '1', [verifyConfigEnvVar]: JSON.stringify(run) };
}

export function isVerifyRunEnabled(env: Readonly<Record<string, string | undefined>>): boolean {
  return env[verifyRunEnvVar] === '1';
}

export function verifyRunFromEnv(env: Readonly<Record<string, string | undefined>>): VerifyRun {
  const raw = env[verifyConfigEnvVar];
  if (!isVerifyRunEnabled(env) || raw === undefined) {
    throw new Error(
      `verify: ${verifyRunEnvVar}=1 and ${verifyConfigEnvVar} must be set; run it through pnpm lt verify extension`
    );
  }
  const parsed: unknown = JSON.parse(raw);
  return verifyRunSchema.parse(parsed);
}

const findingSchema = z.object({
  kind: z.enum(verifyFindingKinds),
  message: z.string(),
});

export type VerifyFinding = z.infer<typeof findingSchema>;

const summarySchema = z.object({
  verdict: z.enum(verifyVerdicts),
  exitCode: z.number().int(),
  run: verifyRunSchema,
  findings: z.array(findingSchema),
  artifacts: z.array(z.string()),
  url: z.string().optional(),
  startedAt: z.string(),
  finishedAt: z.string(),
});

export type VerifySummary = z.infer<typeof summarySchema>;

export function verdictFor(findings: readonly VerifyFinding[]): VerifyVerdict {
  const verdicts = new Set(findings.map(finding => findingVerdicts[finding.kind]));
  return verdictPrecedence.find(verdict => verdicts.has(verdict)) ?? 'verified';
}

export function parseVerifySummary(value: unknown): VerifySummary {
  return summarySchema.parse(value);
}
