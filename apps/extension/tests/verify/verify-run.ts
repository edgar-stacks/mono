import type { BrowserContext, Page, Request, Worker } from '@playwright/test';
import { overrideLaunchDarklyFlags } from '@tests/mocks/mock-launchdarkly';
import { makeStacksPolicy, policyStateOverrides } from '@tests/mocks/mock-policies';
import type { GlobalPage } from '@tests/page-object-models/global.page';
import type { HomePage } from '@tests/page-object-models/home.page';
import type { NetworkPage } from '@tests/page-object-models/network.page';
import {
  type OnboardingPage,
  getConnectedTestAppPermissionsState,
  makeLedgerTestAccountWalletState,
} from '@tests/page-object-models/onboarding.page';
import type { SendPage } from '@tests/page-object-models/send.page';
import type { SettingsPage } from '@tests/page-object-models/settings.page';
import type { SwapRevampPage } from '@tests/page-object-models/swap-revamp.page';
import type { SwitchAccountPage } from '@tests/page-object-models/switch-account.page';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  type RequestContext,
  type RpcMethodSpec,
  resolveParams,
  rpcMethods,
} from '@leather.io/test-app/catalog';
import {
  type CapturedConsoleMessage,
  consoleErrorReasons,
  consoleVerdict,
} from '@leather.io/tools/console-verdict';
import {
  type ObservedRequest,
  classifyRequests,
  countByClass,
  realRequestReasons,
} from '@leather.io/tools/network-classification';
import { buildStateEvidence } from '@leather.io/tools/state-evidence';
import {
  type VerifyPlan,
  type VerifySummary,
  backgroundErrorsStorageKey,
  decideVerdict,
  verifyArtifacts,
  verifyExitCodes,
} from '@leather.io/tools/verify-contract';

import { consoleAllowlist } from './console-allowlist';
import { baseMockName, fallbackMockName, verifyMockRegistry } from './mock-registry';
import { type RouteOutcomes, recordRoutes } from './route-recorder';

export interface VerifyFixtures {
  readonly context: BrowserContext;
  readonly page: Page;
  readonly extensionId: string;
  readonly globalPage: GlobalPage;
  readonly homePage: HomePage;
  readonly onboardingPage: OnboardingPage;
  readonly sendPage: SendPage;
  readonly swapRevampPage: SwapRevampPage;
  readonly networkPage: NetworkPage;
  readonly settingsPage: SettingsPage;
  readonly switchAccountPage: SwitchAccountPage;
}

const testAppUrl = 'http://localhost:3000';
const persistRootKey = 'persist:root';
const encryptionKeyName = 'encryptionKey';
const capturedConsoleTypes = new Set(['error', 'warning']);

interface RunState {
  readonly reasons: string[];
  readonly errors: string[];
  readonly envErrors: string[];
  readonly messages: CapturedConsoleMessage[];
  readonly requests: Map<Request, { failure?: string; status?: number }>;
  readonly outcomes: RouteOutcomes;
  rpcRecord?: Record<string, unknown>;
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message.split('\n')[0] ?? error.message;
  return String(error);
}

async function withDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T | undefined> {
  const timers: { timer?: ReturnType<typeof setTimeout> } = {};
  const deadline = new Promise<undefined>(resolve => {
    timers.timer = setTimeout(resolve, timeoutMs, undefined);
  });
  try {
    return await Promise.race([promise, deadline]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timers.timer);
  }
}

function watchPage(page: Page, state: RunState) {
  page.on('console', message => {
    if (!capturedConsoleTypes.has(message.type())) return;
    state.messages.push({
      source: 'console',
      type: message.type(),
      text: message.text(),
      url: message.location().url || page.url(),
    });
  });
  page.on('pageerror', error => {
    state.messages.push({
      source: 'pageerror',
      type: 'error',
      text: error.stack ?? error.message,
      url: page.url(),
    });
  });
}

function watchContext(context: BrowserContext, state: RunState) {
  context.pages().forEach(page => watchPage(page, state));
  context.on('page', page => watchPage(page, state));
  context.on('request', request => state.requests.set(request, {}));
  context.on('requestfailed', request => {
    state.requests.set(request, {
      ...state.requests.get(request),
      failure: request.failure()?.errorText ?? 'failed',
    });
  });
  context.on('response', response => {
    const request = response.request();
    state.requests.set(request, { ...state.requests.get(request), status: response.status() });
  });
}

function orderedMocks(plan: VerifyPlan) {
  const rest = plan.mocks.filter(name => name !== fallbackMockName && name !== baseMockName);
  return [
    ...(plan.mocks.includes(fallbackMockName) ? [fallbackMockName] : []),
    ...(plan.mocks.includes(baseMockName) ? [baseMockName] : []),
    ...rest,
  ];
}

async function applyMocks({ context, page }: VerifyFixtures, plan: VerifyPlan, state: RunState) {
  if (plan.mocksMode === 'none') return;
  for (const name of orderedMocks(plan)) {
    const source = name === fallbackMockName ? 'fallback' : 'mock';
    const mock = Object.entries(verifyMockRegistry).find(([key]) => key === name)?.[1];
    if (!mock) {
      state.errors.push(`mock '${name}' is not in tests/verify/mock-registry.ts`);
      continue;
    }
    try {
      await mock({
        context: recordRoutes(context, source, state.outcomes),
        page: recordRoutes(page, source, state.outcomes),
      });
    } catch (error) {
      state.errors.push(`mock '${name}' could not be applied: ${errorText(error)}`);
    }
  }
  if (Object.keys(plan.flags).length === 0) return;
  await overrideLaunchDarklyFlags(recordRoutes(context, 'mock', state.outcomes), plan.flags);
}

function connectedApp(plan: VerifyPlan, policyId?: string) {
  return plan.connectTestApp ? getConnectedTestAppPermissionsState({ policyId }) : {};
}

async function seedWallet(fixtures: VerifyFixtures, plan: VerifyPlan) {
  const { extensionId, onboardingPage } = fixtures;
  if (plan.accountType === 'ledger') {
    return onboardingPage.signInWithLedgerAccount(extensionId, {
      ...makeLedgerTestAccountWalletState(['bitcoin', 'stacks']),
      ...connectedApp(plan),
    });
  }
  if (plan.accountType === 'mixed') {
    return onboardingPage.signInWithMixedSoftwareAndLedgerWallets(extensionId, connectedApp(plan));
  }
  if (plan.accountType === 'policy') {
    const policy = makeStacksPolicy();
    return onboardingPage.signInWithTestAccount(extensionId, {
      ...policyStateOverrides({ policies: [policy], activePolicyId: policy.id }),
      ...connectedApp(plan, policy.id),
    });
  }
  const networks = { ids: [], entities: {}, currentNetworkId: plan.network };
  return onboardingPage.signInWithTestAccount(extensionId, { networks, ...connectedApp(plan) });
}

async function seedSession(fixtures: VerifyFixtures, plan: VerifyPlan) {
  await fixtures.globalPage.gotoNakedRoot(fixtures.extensionId);
  if (plan.session === 'signed-out') return;
  await seedWallet(fixtures, plan);
  if (plan.session === 'locked') await fixtures.homePage.lock();
}

function backgroundWorker(context: BrowserContext): Promise<Worker> {
  const [worker] = context.serviceWorkers();
  return worker ? Promise.resolve(worker) : context.waitForEvent('serviceworker');
}

async function readBackgroundErrors(context: BrowserContext): Promise<unknown> {
  const worker = await backgroundWorker(context);
  const stored = await worker.evaluate(
    key => chrome.storage.session.get(key),
    backgroundErrorsStorageKey
  );
  return stored[backgroundErrorsStorageKey];
}

async function runOpenActions(fixtures: VerifyFixtures, plan: VerifyPlan, state: RunState) {
  const pageObjects: Readonly<Record<string, object>> = {
    GlobalPage: fixtures.globalPage,
    HomePage: fixtures.homePage,
    OnboardingPage: fixtures.onboardingPage,
    SendPage: fixtures.sendPage,
    SwapRevampPage: fixtures.swapRevampPage,
    NetworkPage: fixtures.networkPage,
    SettingsPage: fixtures.settingsPage,
    SwitchAccountPage: fixtures.switchAccountPage,
  };
  for (const action of plan.open) {
    const [className = '', method = ''] = action.split('.');
    const instance = pageObjects[className];
    const fn: unknown = instance ? Reflect.get(instance, method) : undefined;
    if (!instance || typeof fn !== 'function') {
      state.reasons.push(`open action ${action} is not a method of a fixture page object`);
      return false;
    }
    try {
      await Reflect.apply(fn, instance, []);
    } catch (error) {
      state.reasons.push(`open action ${action} failed: ${errorText(error)}`);
      return false;
    }
  }
  return true;
}

async function waitForReady(target: Page, plan: VerifyPlan, state: RunState) {
  try {
    await target
      .getByTestId(plan.ready)
      .first()
      .waitFor({ state: 'attached', timeout: plan.timeoutMs });
    return true;
  } catch {
    state.reasons.push(`ready selector '${plan.ready}' did not appear within ${plan.timeoutMs}ms`);
    return false;
  }
}

async function openScreen(fixtures: VerifyFixtures, plan: VerifyPlan, state: RunState) {
  const { page, extensionId } = fixtures;
  await page.goto(`chrome-extension://${extensionId}/index.html#${plan.route}`);
  const opened = await runOpenActions(fixtures, plan, state);
  return { target: page, readyMet: opened && (await waitForReady(page, plan, state)) };
}

function pageRequestContext(page: Page, network: string): RequestContext {
  return {
    network,
    request(method, params) {
      const args: [string, unknown] = [method, params];
      return page.evaluate(async ([m, p]) => {
        if (!window.LeatherProvider) throw new Error('LeatherProvider missing');
        const response = await window.LeatherProvider.request(m, p);
        return response.result;
      }, args);
    },
  };
}

async function buildCatalogParams(spec: RpcMethodSpec, context: RequestContext) {
  const params: unknown = await resolveParams(spec, context);
  return { params };
}

async function rpcParams(page: Page, plan: VerifyPlan, state: RunState) {
  const rpc = plan.rpc;
  if (!rpc || rpc.paramsSource === 'none') return { ok: true, params: undefined };
  if (rpc.paramsSource === 'file') return { ok: true, params: rpc.params };
  const spec = rpcMethods.find(method => method.id === rpc.catalogId);
  if (!spec) {
    state.envErrors.push(`test-app catalog has no entry '${rpc.catalogId ?? ''}'`);
    return { ok: false, params: undefined };
  }
  const resolved = await withDeadline(
    buildCatalogParams(spec, pageRequestContext(page, plan.network)),
    plan.timeoutMs
  );
  if (!resolved) {
    state.reasons.push(
      `catalog entry '${spec.id}' did not build its params within ${plan.timeoutMs}ms; pass --params`
    );
    return { ok: false, params: undefined };
  }
  return { ok: true, params: resolved.params };
}

interface RpcOutcome {
  readonly ok: boolean;
  readonly response?: unknown;
  readonly error?: unknown;
}

function sendRpcRequest(page: Page, method: string, params: unknown): Promise<RpcOutcome> {
  const args: [string, unknown] = [method, params];
  return page.evaluate(async ([m, p]) => {
    try {
      if (!window.LeatherProvider) throw new Error('LeatherProvider missing');
      const response: unknown = await window.LeatherProvider.request(m, p);
      return { ok: true, response };
    } catch (error) {
      if (error instanceof Error) return { ok: false, error: { message: error.message } };
      const serialized: unknown = JSON.parse(JSON.stringify(error ?? null));
      return { ok: false, error: serialized };
    }
  }, args);
}

type ApproverEvent =
  | { readonly kind: 'popup'; readonly page: Page }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'response'; readonly outcome: RpcOutcome };

async function waitForApprover(context: BrowserContext, timeout: number): Promise<ApproverEvent> {
  try {
    return { kind: 'popup', page: await context.waitForEvent('page', { timeout }) };
  } catch {
    return { kind: 'timeout' };
  }
}

async function awaitRpcResponse(response: Promise<RpcOutcome>): Promise<ApproverEvent> {
  try {
    return { kind: 'response', outcome: await response };
  } catch (error) {
    return { kind: 'response', outcome: { ok: false, error: { message: errorText(error) } } };
  }
}

async function openRpcApprover(fixtures: VerifyFixtures, plan: VerifyPlan, state: RunState) {
  const { context, page } = fixtures;
  const rpc = plan.rpc;
  if (!rpc) return { target: page, readyMet: false };
  await page.goto(testAppUrl);
  try {
    await page.waitForFunction(() => Boolean(window.LeatherProvider), undefined, {
      timeout: plan.timeoutMs,
    });
  } catch {
    state.envErrors.push(`the test app at ${testAppUrl} never saw window.LeatherProvider`);
    return { target: page, readyMet: false };
  }
  const { ok, params } = await rpcParams(page, plan, state);
  state.rpcRecord = {
    method: rpc.method,
    catalogId: rpc.catalogId,
    paramsSource: rpc.paramsSource,
    params,
  };
  if (!ok) return { target: page, readyMet: false };

  const popup = waitForApprover(context, plan.timeoutMs);
  const first = await Promise.race([
    popup,
    awaitRpcResponse(sendRpcRequest(page, rpc.method, params)),
  ]);
  if (first.kind === 'response') {
    state.rpcRecord = { ...state.rpcRecord, outcome: first.outcome };
    if (!first.outcome.ok) {
      state.errors.push(
        `rpc error before an approver: ${JSON.stringify(first.outcome.error ?? null)}`
      );
      return { target: page, readyMet: false };
    }
  }
  const opened = first.kind === 'response' ? await popup : first;
  if (opened.kind !== 'popup') {
    state.reasons.push(`${rpc.method} opened no window within ${plan.timeoutMs}ms`);
    return { target: page, readyMet: false };
  }
  watchPage(opened.page, state);
  return { target: opened.page, readyMet: await waitForReady(opened.page, plan, state) };
}

function writeJson(outDir: string, file: string, value: unknown) {
  writeFileSync(path.join(outDir, file), `${JSON.stringify(value, null, 2)}\n`);
}

async function writeScreenEvidence(target: Page, outDir: string, artifacts: string[]) {
  try {
    await target.screenshot({
      path: path.join(outDir, verifyArtifacts.screenshot),
      animations: 'disabled',
    });
    artifacts.push(verifyArtifacts.screenshot);
  } catch {
    return;
  }
  try {
    const snapshot = await target.ariaSnapshot();
    writeFileSync(
      path.join(outDir, verifyArtifacts.a11y),
      `# Accessibility tree\n\n${target.url()}\n\n\`\`\`yaml\n${snapshot}\n\`\`\`\n`
    );
    artifacts.push(verifyArtifacts.a11y);
  } catch {
    return;
  }
}

async function readStorage(context: BrowserContext) {
  const worker = await backgroundWorker(context);
  const local = await worker.evaluate(key => chrome.storage.local.get(key), persistRootKey);
  const session = await worker.evaluate(key => chrome.storage.session.get(key), encryptionKeyName);
  const persisted: unknown = local[persistRootKey];
  return { persisted, session };
}

function observedRequests(state: RunState): ObservedRequest[] {
  return [...state.requests.entries()].map(([request, details]) => ({
    url: request.url(),
    method: request.method(),
    resourceType: request.resourceType(),
    outcome: state.outcomes.get(request),
    failure: details.failure,
    status: details.status,
  }));
}

export async function runVerify(
  fixtures: VerifyFixtures,
  plan: VerifyPlan,
  outDir: string
): Promise<VerifySummary> {
  const startedAt = new Date();
  mkdirSync(outDir, { recursive: true });
  const state: RunState = {
    reasons: [],
    errors: [],
    envErrors: [],
    messages: [],
    requests: new Map(),
    outcomes: new Map(),
  };
  const artifacts: string[] = [];
  fixtures.context.setDefaultTimeout(plan.timeoutMs);
  watchContext(fixtures.context, state);

  await applyMocks(fixtures, plan, state);
  const screen = { target: fixtures.page, readyMet: false };
  try {
    await seedSession(fixtures, plan);
    const buffered = await readBackgroundErrors(fixtures.context);
    if (!Array.isArray(buffered)) {
      state.envErrors.push(
        `the background has no ${backgroundErrorsStorageKey} buffer, so dist is not a build:test dist; run pnpm --filter @leather.io/extension build:test`
      );
    } else {
      const opened = plan.rpc
        ? await openRpcApprover(fixtures, plan, state)
        : await openScreen(fixtures, plan, state);
      screen.target = opened.target;
      screen.readyMet = opened.readyMet;
    }
  } catch (error) {
    state.reasons.push(`setup failed: ${errorText(error)}`);
  }

  await writeScreenEvidence(screen.target, outDir, artifacts);

  const verdictOfConsole = consoleVerdict(state.messages, consoleAllowlist, {
    allowConsoleErrors: plan.allowConsoleErrors,
  });
  writeJson(outDir, verifyArtifacts.console, {
    blocking: verdictOfConsole.blocking,
    allowlisted: verdictOfConsole.allowlisted,
    tolerated: verdictOfConsole.tolerated,
    all: state.messages,
  });
  artifacts.push(verifyArtifacts.console);
  state.errors.push(...consoleErrorReasons(verdictOfConsole));

  const requests = classifyRequests(observedRequests(state));
  writeJson(outDir, verifyArtifacts.network, {
    mocksMode: plan.mocksMode,
    counts: countByClass(requests),
    requests,
  });
  artifacts.push(verifyArtifacts.network);
  state.errors.push(...realRequestReasons(requests, plan.mocksMode));

  try {
    const backgroundErrors = await readBackgroundErrors(fixtures.context);
    const list = Array.isArray(backgroundErrors) ? backgroundErrors : [];
    writeJson(outDir, verifyArtifacts.backgroundErrors, list);
    artifacts.push(verifyArtifacts.backgroundErrors);
    state.errors.push(
      ...list.map(entry => {
        const message: unknown =
          typeof entry === 'object' && entry !== null ? Reflect.get(entry, 'message') : entry;
        return `background error: ${String(message)}`;
      })
    );
  } catch (error) {
    state.reasons.push(`could not read background errors: ${errorText(error)}`);
  }

  try {
    const { persisted, session } = await readStorage(fixtures.context);
    writeJson(
      outDir,
      verifyArtifacts.state,
      buildStateEvidence(persisted, session, plan.stateSlices)
    );
    artifacts.push(verifyArtifacts.state);
  } catch (error) {
    state.reasons.push(`could not read wallet state: ${errorText(error)}`);
  }

  if (plan.rpc) {
    writeJson(outDir, verifyArtifacts.rpcRequest, state.rpcRecord ?? { method: plan.rpc.method });
    artifacts.push(verifyArtifacts.rpcRequest);
  }

  const verdict = decideVerdict({
    envErrors: state.envErrors,
    errors: state.errors,
    readyMet: screen.readyMet,
  });
  const summary: VerifySummary = {
    verdict,
    exitCode: verifyExitCodes[verdict],
    label: plan.label,
    featureId: plan.featureId,
    ready: plan.ready,
    readyMet: screen.readyMet,
    reasons: [...state.envErrors, ...state.errors, ...state.reasons],
    artifacts: [...artifacts, verifyArtifacts.summary],
    startedAt: startedAt.toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    plan,
  };
  writeJson(outDir, verifyArtifacts.summary, summary);
  return summary;
}
