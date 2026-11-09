import { type BrowserContext, type Page, type Request, type Route, expect } from '@playwright/test';
import { test } from '@tests/fixtures/fixtures';
import { overrideLaunchDarklyFlags } from '@tests/mocks/mock-launchdarkly';
import { makeStacksPolicy, policyStateOverrides } from '@tests/mocks/mock-policies';
import type { GlobalPage } from '@tests/page-object-models/global.page';
import {
  type OnboardingPage,
  getConnectedTestAppPermissionsState,
  getTestSoftwareAccountDefaultWalletState,
  makeLedgerTestAccountWalletState,
  makeMixedSoftwareAndLedgerWalletState,
} from '@tests/page-object-models/onboarding.page';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type RequestContext, findSpec, resolveParams } from '@leather.io/test-app/catalog';
import { type ConsoleEntry, unexpectedConsoleErrors } from '@leather.io/tools/console-verdict';
import {
  type RequestClass,
  type RouteHandling,
  classifyRequest,
  countRequestClasses,
  routeActions,
} from '@leather.io/tools/network-classification';
import { buildStateEvidence } from '@leather.io/tools/state-evidence';
import {
  type VerifyRun,
  type VerifyVerdict,
  decideVerdict,
  parseVerifyEnv,
  verifyArtifacts,
  verifyBackgroundErrorsKey,
  verifyExitCodes,
  verifyTestAppOrigin,
  verifyVerdicts,
} from '@leather.io/tools/verify-contract';

import { consoleAllowlist } from './console-allowlist';
import { type MockTargets, fallbackMockName, findMock, orderMocks } from './mock-registry';

const bodySelector = 'body';
const flagsHandlerName = 'launchDarklyFlags';
const persistRootKey = 'persist:root';
const encryptionKeyName = 'encryptionKey';
const extensionProtocol = 'chrome-extension:';
const setupBudgetMs = 90_000;
const backgroundSeedTimeoutMs = 5_000;
const providerStatusTestId = 'provider-status';

interface VerifyFixtures {
  readonly context: BrowserContext;
  readonly page: Page;
  readonly extensionId: string;
  readonly globalPage: GlobalPage;
  readonly onboardingPage: OnboardingPage;
  readonly pageObjects: Readonly<Record<string, object>>;
}

interface Recorder {
  readonly consoleEntries: ConsoleEntry[];
  readonly requests: Request[];
  readonly handlings: Map<Request, RouteHandling>;
  readonly failures: Map<Request, string>;
  readonly statuses: Map<Request, number>;
}

interface RpcOutcome {
  readonly ok: boolean;
  readonly response?: unknown;
  readonly error?: unknown;
}

interface Summary {
  readonly verdict: VerifyVerdict;
  readonly exitCode: number;
  readonly label: string;
  readonly featureId?: string;
  readonly reasons: readonly string[];
  readonly [key: string]: unknown;
}

function writeJson(run: VerifyRun, file: string, value: unknown) {
  writeFileSync(path.join(run.outDir, file), `${JSON.stringify(value, null, 2)}\n`);
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function attachConsole(page: Page, recorder: Recorder) {
  page.on('console', message =>
    recorder.consoleEntries.push({
      source: 'console',
      type: message.type(),
      text: message.text(),
      url: page.url(),
      location: message.location().url || undefined,
    })
  );
  page.on('pageerror', error =>
    recorder.consoleEntries.push({
      source: 'pageerror',
      type: 'error',
      text: `${error.name}: ${error.message}`,
      url: page.url(),
    })
  );
}

function startRecording(context: BrowserContext, page: Page): Recorder {
  const recorder: Recorder = {
    consoleEntries: [],
    requests: [],
    handlings: new Map(),
    failures: new Map(),
    statuses: new Map(),
  };
  attachConsole(page, recorder);
  context.on('page', opened => attachConsole(opened, recorder));
  context.on('request', request => recorder.requests.push(request));
  context.on('requestfailed', request =>
    recorder.failures.set(request, request.failure()?.errorText ?? 'failed')
  );
  context.on('response', response => recorder.statuses.set(response.request(), response.status()));
  return recorder;
}

function trackRoute(route: Route, onAction: (action: RouteHandling['action']) => void): Route {
  return new Proxy(route, {
    get(target, property) {
      const value: unknown = Reflect.get(target, property, target);
      if (typeof value !== 'function') return value;
      const action = routeActions.find(name => name === property);
      return (...args: unknown[]): unknown => {
        if (action) onAction(action);
        const result: unknown = Reflect.apply(value, target, args);
        return result;
      };
    },
  });
}

function recordingTarget<T extends Page | BrowserContext>(
  target: T,
  handler: string,
  recorder: Recorder
): T {
  return new Proxy(target, {
    get(original, property) {
      const value: unknown = Reflect.get(original, property, original);
      if (typeof value !== 'function') return value;
      if (property !== 'route') {
        return (...args: unknown[]): unknown => {
          const result: unknown = Reflect.apply(value, original, args);
          return result;
        };
      }
      return (url: unknown, routeHandler: unknown, options?: unknown): unknown => {
        if (typeof routeHandler !== 'function') {
          const result: unknown = Reflect.apply(value, original, [url, routeHandler, options]);
          return result;
        }
        const handlerFunction = routeHandler;
        function wrapped(route: Route, request: Request): unknown {
          const tracked = trackRoute(route, action =>
            recorder.handlings.set(request, { handler, action })
          );
          const result: unknown = Reflect.apply(handlerFunction, undefined, [tracked, request]);
          return result;
        }
        const result: unknown = Reflect.apply(value, original, [url, wrapped, options]);
        return result;
      };
    },
  });
}

async function applyMocks(
  run: VerifyRun,
  context: BrowserContext,
  page: Page,
  recorder: Recorder
): Promise<string[]> {
  if (run.mocks.mode === 'none') return [];
  const unapplied: string[] = [];
  for (const name of orderMocks(run.mocks.names)) {
    const apply = findMock(name);
    if (!apply) {
      unapplied.push(`${name} (not in tests/verify/mock-registry.ts)`);
      continue;
    }
    const targets: MockTargets = {
      context: recordingTarget(context, name, recorder),
      page: recordingTarget(page, name, recorder),
    };
    try {
      await apply(targets);
    } catch (error) {
      unapplied.push(`${name} (${errorText(error)})`);
    }
  }
  if (Object.keys(run.flags).length > 0) {
    await overrideLaunchDarklyFlags(
      recordingTarget(context, flagsHandlerName, recorder),
      run.flags
    );
  }
  return unapplied;
}

const stacksPolicy = makeStacksPolicy();

function stateOverrides(run: VerifyRun): Record<string, unknown> {
  const networks = { ids: [], entities: {}, currentNetworkId: run.network };
  const policyId = run.accountType === 'policy' ? stacksPolicy.id : undefined;
  const permissions = run.connectTestApp ? getConnectedTestAppPermissionsState({ policyId }) : {};
  const policy =
    run.accountType === 'policy'
      ? policyStateOverrides({ policies: [stacksPolicy], activePolicyId: stacksPolicy.id })
      : {};
  return { ...policy, ...permissions, networks };
}

function lockedWalletState(run: VerifyRun) {
  const overrides = stateOverrides(run);
  if (run.accountType === 'mixed')
    return { ...makeMixedSoftwareAndLedgerWalletState(), ...overrides };
  return { ...getTestSoftwareAccountDefaultWalletState(), ...overrides };
}

async function seedSession(run: VerifyRun, fixtures: VerifyFixtures) {
  const { extensionId, globalPage, onboardingPage } = fixtures;
  await globalPage.gotoNakedRoot(extensionId);
  if (run.session === 'signed-out') return;
  if (run.session === 'locked') {
    await onboardingPage.seedLockedWallet(extensionId, lockedWalletState(run));
    return;
  }
  const overrides = stateOverrides(run);
  if (run.accountType === 'ledger') {
    await onboardingPage.signInWithLedgerAccount(extensionId, {
      ...makeLedgerTestAccountWalletState(['bitcoin', 'stacks']),
      ...overrides,
    });
    return;
  }
  if (run.accountType === 'mixed') {
    await onboardingPage.signInWithMixedSoftwareAndLedgerWallets(extensionId, overrides);
    return;
  }
  await onboardingPage.signInWithTestAccount(extensionId, overrides);
}

function isExtensionPage(page: Page) {
  return page.url().startsWith(extensionProtocol);
}

async function readBackgroundErrors(page: Page): Promise<unknown> {
  return page.evaluate(async key => {
    const stored = await chrome.storage.session.get(key);
    const value: unknown = stored[key];
    return value;
  }, verifyBackgroundErrorsKey);
}

async function isTestBuild(page: Page) {
  try {
    await expect
      .poll(() => readBackgroundErrors(page), { timeout: backgroundSeedTimeoutMs })
      .toBeInstanceOf(Array);
    return true;
  } catch {
    return false;
  }
}

async function runOpenAction(pageObjects: Readonly<Record<string, object>>, action: string) {
  const [className = '', methodName = ''] = action.split('.');
  const owner = pageObjects[className];
  const method: unknown = owner ? Reflect.get(owner, methodName) : undefined;
  if (!owner || typeof method !== 'function') {
    throw new Error(`open action ${action} is not a method of a fixture page object`);
  }
  const result: unknown = Reflect.apply(method, owner, []);
  await result;
}

async function waitForReady(target: Page, run: VerifyRun) {
  try {
    await target
      .getByTestId(run.ready)
      .first()
      .waitFor({ state: 'visible', timeout: run.timeoutMs });
    return true;
  } catch {
    return false;
  }
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

async function resolveRpcParams(page: Page, run: VerifyRun): Promise<unknown> {
  const rpc = run.rpc;
  if (!rpc) return undefined;
  if (rpc.hasParams) return rpc.params;
  if (!rpc.catalogId) return undefined;
  const spec = findSpec(rpc.catalogId);
  if (!spec) throw new Error(`no test-app catalog entry ${rpc.catalogId}`);
  return resolveParams(spec, pageRequestContext(page, run.network));
}

function sendRpc(page: Page, method: string, params: unknown): Promise<RpcOutcome> {
  const args: [string, unknown] = [method, params];
  return page
    .evaluate(async ([m, p]) => {
      if (!window.LeatherProvider) return { ok: false, error: 'LeatherProvider missing' };
      try {
        const response: unknown = await window.LeatherProvider.request(m, p);
        return { ok: true, response };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : error };
      }
    }, args)
    .catch(error => ({ ok: false, error: errorText(error) }));
}

interface ScreenResult {
  readonly target: Page;
  readonly readyMet: boolean;
  readonly notes: readonly string[];
  readonly rpcErrorBeforeApprover?: string;
  readonly rpcRequest?: Record<string, unknown>;
}

async function popupArrives(popupPromise: Promise<Page | undefined>) {
  return { popup: await popupPromise, outcome: undefined };
}

async function outcomeArrives(outcomePromise: Promise<RpcOutcome>) {
  return { popup: undefined, outcome: await outcomePromise };
}

async function openRpcScreen(
  run: VerifyRun,
  context: BrowserContext,
  page: Page
): Promise<ScreenResult> {
  const method = run.rpc?.method ?? '';
  await page.goto(verifyTestAppOrigin);
  await expect(page.getByTestId(providerStatusTestId)).toHaveAttribute('data-installed', 'true', {
    timeout: run.timeoutMs,
  });
  const params = await resolveRpcParams(page, run);
  const popupPromise = context
    .waitForEvent('page', { timeout: run.timeoutMs })
    .catch(() => undefined);
  const outcomePromise = sendRpc(page, method, params);
  const first = await Promise.race([popupArrives(popupPromise), outcomeArrives(outcomePromise)]);
  const settledFirst = first.outcome;
  const popup = first.popup ?? (settledFirst?.ok ? await popupPromise : undefined);
  const settled = await Promise.race([
    outcomePromise,
    Promise.resolve<RpcOutcome | undefined>(undefined),
  ]);
  const rpcRequest = {
    method,
    catalogId: run.rpc?.catalogId,
    params,
    approverUrl: popup?.url(),
    outcome: settled ?? 'pending',
  };
  if (settledFirst && !settledFirst.ok) {
    return {
      target: page,
      readyMet: false,
      notes: [],
      rpcErrorBeforeApprover: JSON.stringify(settledFirst.error),
      rpcRequest,
    };
  }
  const target = popup ?? page;
  const notes = popup ? [] : ['no approver or tab opened for the request'];
  return { target, readyMet: await waitForReady(target, run), notes, rpcRequest };
}

async function openRouteScreen(run: VerifyRun, fixtures: VerifyFixtures): Promise<ScreenResult> {
  const { page, extensionId, pageObjects } = fixtures;
  await page.goto(`chrome-extension://${extensionId}/index.html#${run.path}`);
  for (const action of run.open) {
    try {
      await runOpenAction(pageObjects, action);
    } catch (error) {
      return {
        target: page,
        readyMet: false,
        notes: [`open action ${action} failed: ${errorText(error)}`],
      };
    }
  }
  return { target: page, readyMet: await waitForReady(page, run), notes: [] };
}

async function evidencePage(context: BrowserContext, extensionId: string, candidates: Page[]) {
  const open = candidates.find(candidate => !candidate.isClosed() && isExtensionPage(candidate));
  if (open) return open;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/index.html`);
  return page;
}

async function captureState(page: Page, run: VerifyRun) {
  const stored = await page.evaluate(
    async ([rootKey, sessionKey]) => {
      const local = await chrome.storage.local.get(rootKey);
      const session = await chrome.storage.session.get(sessionKey);
      const persistedRoot: unknown = local[rootKey];
      return { persistedRoot, encryptionKeyPresent: Boolean(session[sessionKey]) };
    },
    [persistRootKey, encryptionKeyName]
  );
  return buildStateEvidence({ ...stored, slices: run.stateSlices });
}

async function captureVisuals(target: Page, run: VerifyRun) {
  const notes: string[] = [];
  try {
    await target.screenshot({ path: path.join(run.outDir, verifyArtifacts.screenshot) });
  } catch (error) {
    notes.push(`screenshot failed: ${errorText(error)}`);
  }
  try {
    const snapshot = await target.locator(bodySelector).ariaSnapshot({ timeout: run.timeoutMs });
    writeFileSync(path.join(run.outDir, verifyArtifacts.a11y), `${snapshot}\n`);
  } catch (error) {
    notes.push(`aria snapshot failed: ${errorText(error)}`);
  }
  return notes;
}

function networkEvidence(recorder: Recorder) {
  return recorder.requests.map(request => {
    const handling = recorder.handlings.get(request);
    const failure = recorder.failures.get(request);
    const requestClass: RequestClass = classifyRequest(
      { url: request.url(), handling, failure },
      fallbackMockName
    );
    return {
      class: requestClass,
      method: request.method(),
      url: request.url(),
      resourceType: request.resourceType(),
      status: recorder.statuses.get(request),
      handledBy: handling,
      failure,
    };
  });
}

function writeSummary(run: VerifyRun, summary: Summary) {
  writeJson(run, verifyArtifacts.summary, summary);
  return summary;
}

function envSummary(run: VerifyRun, reason: string): Summary {
  return {
    verdict: 'env',
    exitCode: verifyExitCodes.env,
    label: run.label,
    featureId: run.featureId,
    reasons: [reason],
  };
}

async function verifyScreen(fixtures: VerifyFixtures): Promise<Summary> {
  const parsed = parseVerifyEnv(process.env);
  if (!parsed.ok) throw new Error(parsed.error);
  const run = parsed.value;
  const { context, page, extensionId } = fixtures;
  const startedAt = new Date().toISOString();
  mkdirSync(run.outDir, { recursive: true });

  const recorder = startRecording(context, page);
  const unappliedMocks = await applyMocks(run, context, page, recorder);
  await seedSession(run, fixtures);
  if (!(await isTestBuild(page))) {
    return writeSummary(
      run,
      envSummary(
        run,
        `the extension dist is not a build:test build: chrome.storage.session has no ${verifyBackgroundErrorsKey}; run pnpm --filter @leather.io/extension build:test`
      )
    );
  }

  const screenConsoleStart = recorder.consoleEntries.length;
  const screen = run.rpc
    ? await openRpcScreen(run, context, page)
    : await openRouteScreen(run, fixtures);
  const visualNotes = await captureVisuals(screen.target, run);
  if (screen.rpcRequest) writeJson(run, verifyArtifacts.rpcRequest, screen.rpcRequest);

  const storagePage = await evidencePage(context, extensionId, [screen.target, page]);
  const backgroundErrors: unknown = await readBackgroundErrors(storagePage);
  const backgroundList = Array.isArray(backgroundErrors) ? backgroundErrors : [];
  writeJson(run, verifyArtifacts.backgroundErrors, backgroundList);
  writeJson(run, verifyArtifacts.state, await captureState(storagePage, run));

  const setupEntries = recorder.consoleEntries.slice(0, screenConsoleStart);
  const screenEntries = recorder.consoleEntries.slice(screenConsoleStart);
  const unexpected = run.allowConsoleErrors
    ? []
    : unexpectedConsoleErrors(screenEntries, consoleAllowlist);
  writeJson(run, verifyArtifacts.console, {
    setupEntries,
    entries: screenEntries,
    unexpectedErrors: unexpected,
  });
  const network = networkEvidence(recorder);
  const counts = countRequestClasses(network.map(entry => entry.class));
  writeJson(run, verifyArtifacts.network, { counts, requests: network });

  const decision = decideVerdict({
    readyMet: screen.readyMet,
    rpcErrorBeforeApprover: screen.rpcErrorBeforeApprover,
    unexpectedConsoleErrors: unexpected.length,
    backgroundErrors: backgroundList.length,
    realRequests: counts.real,
    unappliedMocks,
    mocksNone: run.mocks.mode === 'none',
  });
  return writeSummary(run, {
    verdict: decision.verdict,
    exitCode: verifyExitCodes[decision.verdict],
    label: run.label,
    featureId: run.featureId,
    reasons: [...decision.reasons, ...screen.notes, ...visualNotes],
    readyMet: screen.readyMet,
    ready: run.ready,
    url: screen.target.url(),
    startedAt,
    finishedAt: new Date().toISOString(),
    requests: counts,
    consoleErrors: unexpected.length,
    backgroundErrors: backgroundList.length,
    unappliedMocks,
    run: { ...run, rpc: run.rpc ? { ...run.rpc, params: undefined } : undefined },
  });
}

const parsedRun = parseVerifyEnv(process.env);
const timeoutMs = parsedRun.ok ? parsedRun.value.timeoutMs : 0;

test.describe('Verify a mapped screen', () => {
  test.setTimeout(timeoutMs * 3 + setupBudgetMs);

  test('opens the screen under its preconditions and records evidence', async ({
    context,
    page,
    extensionId,
    globalPage,
    homePage,
    onboardingPage,
    sendPage,
    swapRevampPage,
    networkPage,
    settingsPage,
    switchAccountPage,
  }) => {
    const summary = await verifyScreen({
      context,
      page,
      extensionId,
      globalPage,
      onboardingPage,
      pageObjects: {
        GlobalPage: globalPage,
        HomePage: homePage,
        OnboardingPage: onboardingPage,
        SendPage: sendPage,
        SwapRevampPage: swapRevampPage,
        NetworkPage: networkPage,
        SettingsPage: settingsPage,
        SwitchAccountPage: switchAccountPage,
      },
    });
    expect(verifyVerdicts).toContain(summary.verdict);
  });
});
