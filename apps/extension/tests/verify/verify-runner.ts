import type { BrowserContext, Page } from '@playwright/test';
import { requestLeatherProvider } from '@tests/leather-provider';
import { overrideLaunchDarklyFlags } from '@tests/mocks/mock-launchdarkly';
import { z } from 'zod';

import { type RequestContext, findSpec, resolveParams } from '@leather.io/test-app/catalog';
import { allowRuleFor, consoleFindings } from '@leather.io/tools/console-verdict';
import { classifyNetworkRequests, networkFindings } from '@leather.io/tools/network-classification';
import { buildStateEvidence } from '@leather.io/tools/state-evidence';
import {
  type VerifyFinding,
  type VerifyRun,
  type VerifySummary,
  backgroundErrorsStorageKey,
  verdictFor,
  verifyArtifacts,
  verifyExitCodes,
} from '@leather.io/tools/verify-contract';

import { verifyConsoleAllowlist } from './console-allowlist';
import { findVerifyMock, verifyFallbackMockName } from './mock-registry';
import { VerifyEvidence, writeArtifact } from './verify-evidence';
import { type VerifySessionPages, seedVerifySession } from './verify-session';

const testAppUrl = 'http://localhost:3000';
const persistRootKey = 'persist:root';
const encryptionKeyName = 'encryptionKey';

const backgroundErrorsSchema = z.array(z.object({ ts: z.string(), message: z.string() }));

export interface VerifyFixtures extends VerifySessionPages {
  readonly context: BrowserContext;
  readonly page: Page;
  readonly pageObjects: Readonly<Record<string, object>>;
}

interface RpcCapture {
  readonly method: string;
  readonly catalogId?: string;
  readonly paramsSource: string;
  params?: unknown;
  response?: unknown;
}

class VerifyFailure extends Error {
  constructor(readonly finding: VerifyFinding) {
    super(finding.message);
  }
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function step<T>(kind: VerifyFinding['kind'], label: string, action: () => Promise<T>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof VerifyFailure) throw error;
    throw new VerifyFailure({ kind, message: `${label}: ${messageOf(error)}` });
  }
}

async function applyMocks(run: VerifyRun, fixtures: VerifyFixtures, evidence: VerifyEvidence) {
  const findings: VerifyFinding[] = [];
  await evidence.trackRequests('real');
  if (run.mocks.mode === 'none') return findings;
  const target = { context: fixtures.context, page: fixtures.page };
  const { names } = run.mocks;
  if (names.includes(verifyFallbackMockName)) {
    await findVerifyMock(verifyFallbackMockName)?.(target);
    await evidence.trackRequests('fallback');
  }
  for (const name of names.filter(item => item !== verifyFallbackMockName)) {
    const mock = findVerifyMock(name);
    if (!mock) {
      findings.push({
        kind: 'unapplied-mock',
        message: `mock '${name}' is not in tests/verify/mock-registry.ts, so the run went on without it`,
      });
      continue;
    }
    await mock(target);
  }
  if (Object.keys(run.flags).length > 0)
    await overrideLaunchDarklyFlags(fixtures.context, run.flags);
  return findings;
}

function backgroundWorker(context: BrowserContext) {
  const [worker] = context.serviceWorkers();
  return worker ? Promise.resolve(worker) : context.waitForEvent('serviceworker');
}

async function readBackgroundErrors(context: BrowserContext) {
  const worker = await backgroundWorker(context);
  const stored = await worker.evaluate(async key => {
    const value: unknown = (await chrome.storage.session.get(key))[key];
    return value;
  }, backgroundErrorsStorageKey);
  const parsed = backgroundErrorsSchema.safeParse(stored);
  return parsed.success ? parsed.data : undefined;
}

async function readPersistedState(context: BrowserContext) {
  const worker = await backgroundWorker(context);
  return worker.evaluate(
    async ([rootKey, keyName]) => {
      const local = await chrome.storage.local.get(rootKey);
      const session = await chrome.storage.session.get(keyName);
      const key: unknown = session[keyName];
      const persisted: unknown = local[rootKey];
      return {
        persisted,
        encryptionKeyPresent: typeof key === 'string' && key.length > 0,
      };
    },
    [persistRootKey, encryptionKeyName] as const
  );
}

async function callOpenAction(fixtures: VerifyFixtures, className: string, method: string) {
  const target = fixtures.pageObjects[className];
  const action: unknown = target ? Reflect.get(target, method) : undefined;
  if (!target || typeof action !== 'function') {
    throw new Error(`${className}.${method} is not a method of a fixture page object`);
  }
  await Reflect.apply(action, target, []);
}

async function openScreen(run: VerifyRun, fixtures: VerifyFixtures) {
  const { page, extensionId } = fixtures;
  await step('ready-not-met', `open ${run.route}`, () =>
    page.goto(`chrome-extension://${extensionId}/index.html#${run.route}`)
  );
  for (const { className, method } of run.open) {
    await step('ready-not-met', `open action ${className}.${method}`, () =>
      callOpenAction(fixtures, className, method)
    );
  }
  return page;
}

function testAppRequestContext(page: Page, network: string): RequestContext {
  return {
    network,
    async request(method, params) {
      const response = await page.evaluate(requestLeatherProvider, { method, params });
      if (response.error !== undefined) throw new Error(JSON.stringify(response.error));
      return response.result;
    },
  };
}

async function resolveRpcParams(run: VerifyRun, page: Page) {
  const { rpc } = run;
  if (!rpc || rpc.paramsSource !== 'catalog' || rpc.catalogId === undefined) return rpc?.params;
  const spec = findSpec(rpc.catalogId);
  if (!spec) throw new Error(`no test-app catalog entry with id ${rpc.catalogId}`);
  return resolveParams(spec, testAppRequestContext(page, run.network));
}

function rpcResponseError(response: Record<string, unknown>) {
  const { error } = response;
  return error === undefined ? undefined : JSON.stringify(error);
}

async function openRpc(run: VerifyRun, fixtures: VerifyFixtures, capture: RpcCapture) {
  const { page, context } = fixtures;
  await step('ready-not-met', `open ${testAppUrl}`, () => page.goto(testAppUrl));
  capture.params = await step('rpc-error', 'resolve rpc params', () => resolveRpcParams(run, page));

  const popupPromise = context.waitForEvent('page', { timeout: run.timeout });
  const responsePromise = page.evaluate(requestLeatherProvider, {
    method: capture.method,
    params: capture.params,
  });
  popupPromise.catch(() => undefined);
  responsePromise.catch(() => undefined);

  async function popupFirst() {
    return { popup: await popupPromise, response: undefined };
  }
  async function responseFirst() {
    const response = await responsePromise;
    capture.response = response;
    return { popup: undefined, response };
  }
  const first = await step('ready-not-met', `wait for the ${capture.method} approver`, () =>
    Promise.race([popupFirst(), responseFirst()])
  );
  if (first.response) {
    const error = rpcResponseError(first.response);
    if (error !== undefined) {
      throw new VerifyFailure({
        kind: 'rpc-error',
        message: `${capture.method} answered with an error before any approver opened: ${error}`,
      });
    }
  }
  const popup =
    first.popup ??
    (await step('ready-not-met', `wait for the ${capture.method} window`, () => popupPromise));
  return popup;
}

async function waitForReady(target: Page, run: VerifyRun) {
  await step('ready-not-met', `ready selector '${run.ready}'`, () =>
    target.getByTestId(run.ready).first().waitFor({ state: 'attached', timeout: run.timeout })
  );
}

interface CollectInput {
  readonly run: VerifyRun;
  readonly fixtures: VerifyFixtures;
  readonly evidence: VerifyEvidence;
  readonly target: Page;
  readonly rpc?: RpcCapture;
}

async function writeScreenEvidence({ run, target }: CollectInput) {
  const artifacts: string[] = [];
  if (target.isClosed()) return artifacts;
  await target.screenshot({
    path: `${run.outDir}/${verifyArtifacts.screenshot}`,
    animations: 'disabled',
  });
  artifacts.push(verifyArtifacts.screenshot);
  const snapshot = await target.ariaSnapshot();
  artifacts.push(
    writeArtifact(
      run.outDir,
      verifyArtifacts.a11y,
      `# Accessibility snapshot\n\n${target.url()}\n\n\`\`\`yaml\n${snapshot}\n\`\`\`\n`
    )
  );
  return artifacts;
}

async function collectEvidence(input: CollectInput) {
  const { run, fixtures, evidence, rpc } = input;
  const findings: VerifyFinding[] = [];
  const artifacts: string[] = [];
  const outDir = run.outDir;

  try {
    artifacts.push(...(await writeScreenEvidence(input)));
  } catch (error) {
    findings.push({ kind: 'ready-not-met', message: `screenshot: ${messageOf(error)}` });
  }

  artifacts.push(
    writeArtifact(outDir, verifyArtifacts.console, {
      pages: evidence.pageConsole,
      background: evidence.workerConsole,
      pageErrors: evidence.pageErrors,
    })
  );
  findings.push(
    ...consoleFindings({
      consoleEntries: evidence.pageConsole,
      pageErrors: evidence.pageErrors,
      allowlist: verifyConsoleAllowlist,
      allowConsoleErrors: run.allowConsoleErrors,
    })
  );

  const requests = classifyNetworkRequests(evidence.networkRecords());
  artifacts.push(writeArtifact(outDir, verifyArtifacts.network, requests));
  findings.push(...networkFindings(requests, run.mocks.mode !== 'none'));

  const backgroundErrors = await readBackgroundErrors(fixtures.context);
  artifacts.push(writeArtifact(outDir, verifyArtifacts.backgroundErrors, backgroundErrors ?? null));
  if (!backgroundErrors) {
    findings.push({
      kind: 'env',
      message: `chrome.storage.session has no ${backgroundErrorsStorageKey}: the dist is not a build:test dist. Rebuild with pnpm --filter @leather.io/extension build:test`,
    });
  }
  for (const entry of backgroundErrors ?? []) {
    if (allowRuleFor(entry.message, verifyConsoleAllowlist)) continue;
    findings.push({ kind: 'background-error', message: `${entry.ts} ${entry.message}` });
  }

  const state = await readPersistedState(fixtures.context);
  artifacts.push(
    writeArtifact(
      outDir,
      verifyArtifacts.state,
      buildStateEvidence({ ...state, slices: run.stateSlices })
    )
  );

  if (rpc) artifacts.push(writeArtifact(outDir, verifyArtifacts.rpcRequest, rpc));
  return { findings, artifacts };
}

export async function runVerify(run: VerifyRun, fixtures: VerifyFixtures): Promise<VerifySummary> {
  const startedAt = new Date().toISOString();
  fixtures.context.setDefaultTimeout(run.timeout);
  const evidence = new VerifyEvidence(fixtures.context);
  evidence.attach();
  const findings: VerifyFinding[] = [];
  const rpc: RpcCapture | undefined = run.rpc
    ? { method: run.rpc.method, catalogId: run.rpc.catalogId, paramsSource: run.rpc.paramsSource }
    : undefined;
  let target = fixtures.page;

  try {
    findings.push(...(await step('env', 'apply mocks', () => applyMocks(run, fixtures, evidence))));
    await step('ready-not-met', `seed a ${run.session} ${run.accountType} session`, () =>
      seedVerifySession(run, fixtures)
    );
    target = rpc ? await openRpc(run, fixtures, rpc) : await openScreen(run, fixtures);
    await waitForReady(target, run);
  } catch (error) {
    findings.push(
      error instanceof VerifyFailure
        ? error.finding
        : { kind: 'ready-not-met', message: messageOf(error) }
    );
  }

  const collected = await collectEvidence({ run, fixtures, evidence, target, rpc });
  findings.push(...collected.findings);
  const verdict = verdictFor(findings);
  const summary: VerifySummary = {
    verdict,
    exitCode: verifyExitCodes[verdict],
    run,
    findings,
    artifacts: [...collected.artifacts, verifyArtifacts.summary],
    url: target.isClosed() ? undefined : target.url(),
    startedAt,
    finishedAt: new Date().toISOString(),
  };
  writeArtifact(run.outDir, verifyArtifacts.summary, summary);
  return summary;
}
