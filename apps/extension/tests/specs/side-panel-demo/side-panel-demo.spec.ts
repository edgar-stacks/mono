import { type BrowserContext, type Page, chromium } from '@playwright/test';
import { type TestRpcResponse, getResponseAddresses } from '@tests/leather-provider';
import { getTestSoftwareAccountDefaultWalletState } from '@tests/page-object-models/onboarding.page';
import { HomePageSelectors } from '@tests/selectors/home.selectors';
import { ConnectAccountSelectors } from '@tests/selectors/requests.selectors';
import { SettingsSelectors } from '@tests/selectors/settings.selectors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test as base } from '../../fixtures/fixtures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sidePanelPage = 'side-panel.html';
const panelViewport = { width: 400, height: 800 };
const userRejectionCode = 4001;
const userActivationExpiryMs = 6000;

declare global {
  interface Window {
    leatherResult?: Promise<TestRpcResponse>;
  }
}

const test = base.extend({
  async context({ headless }, use) {
    const pathToExtension = path.join(__dirname, '../../../dist');
    const context = await chromium.launchPersistentContext('', {
      headless,
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
  },
});

function getSeenIntrosWalletState() {
  const state = getTestSoftwareAccountDefaultWalletState();
  return {
    settings: {
      ...state.settings,
      seenFeatureIntros: ['multi-wallet-support', 'side-panel-mode'],
    },
  };
}

async function getServiceWorker(context: BrowserContext) {
  const [worker] = context.serviceWorkers();
  return worker ?? (await context.waitForEvent('serviceworker'));
}

async function getActionPopup(context: BrowserContext) {
  const worker = await getServiceWorker(context);
  return worker.evaluate(() => chrome.action.getPopup({}));
}

async function getIsGlobalPanelEnabled(context: BrowserContext) {
  const worker = await getServiceWorker(context);
  return worker.evaluate(async () => (await chrome.sidePanel.getOptions({})).enabled);
}

function waitForSidePanel(context: BrowserContext) {
  return context.waitForEvent('page', {
    predicate: page => page.url().includes(sidePanelPage),
  });
}

async function requestGetAddressesOnClick(page: Page) {
  await page.evaluate(() => {
    const button = document.createElement('button');
    button.textContent = 'Connect Leather';
    button.addEventListener('click', () => {
      if (!window.LeatherProvider) throw new Error('LeatherProvider not found');
      window.leatherResult = window.LeatherProvider.request('getAddresses').catch(
        (e: TestRpcResponse) => e
      );
    });
    document.body.prepend(button);
  });
  await page.getByRole('button', { name: 'Connect Leather' }).click();
}

function getRequestResult(page: Page) {
  return page.evaluate(() => window.leatherResult);
}

test.describe('Side panel mode demo', () => {
  test.describe('with a wallet', () => {
    test.beforeEach(async ({ extensionId, globalPage, onboardingPage, page }) => {
      await globalPage.setupAndUseApiCalls(extensionId);
      await onboardingPage.signInWithTestAccount(extensionId, getSeenIntrosWalletState());
      await test.expect.poll(() => getIsGlobalPanelEnabled(page.context())).toBe(true);
      await page.goto('localhost:3000');
    });

    test('home renders at panel size', async ({ context, extensionId }) => {
      const panel = await context.newPage();
      await panel.setViewportSize(panelViewport);
      await panel.goto(`chrome-extension://${extensionId}/${sidePanelPage}`);
      await test.expect(panel.getByTestId(HomePageSelectors.HomePageContainer)).toBeVisible();
    });

    test('a click-gesture request opens in the panel and cancel returns home', async ({
      context,
      page,
    }) => {
      const panelPromise = waitForSidePanel(context);
      await requestGetAddressesOnClick(page);
      const panel = await panelPromise;

      await test.expect(panel.getByTestId(ConnectAccountSelectors.ApproveBtn)).toBeVisible();
      await panel.getByRole('button', { name: 'Cancel' }).click();

      await test.expect(panel.getByTestId(HomePageSelectors.HomePageContainer)).toBeVisible();
      const result = await getRequestResult(page);
      test.expect(result?.error?.code).toEqual(userRejectionCode);
    });

    test('getAddresses approves in the panel', async ({ context, page }) => {
      const panelPromise = waitForSidePanel(context);
      await requestGetAddressesOnClick(page);
      const panel = await panelPromise;

      await panel.getByTestId(ConnectAccountSelectors.ApproveBtn).click();

      const result = await getRequestResult(page);
      test.expect(getResponseAddresses(result).length).toBeGreaterThan(0);
    });

    test('a request arriving while the panel sits at home hands off', async ({ context, page }) => {
      const panelPromise = waitForSidePanel(context);
      await requestGetAddressesOnClick(page);
      const panel = await panelPromise;
      await panel.getByRole('button', { name: 'Cancel' }).click();
      await test.expect(panel.getByTestId(HomePageSelectors.HomePageContainer)).toBeVisible();

      await requestGetAddressesOnClick(page);

      await test.expect(panel.getByTestId(ConnectAccountSelectors.ApproveBtn)).toBeVisible();
    });

    test('turning sidebar mode off restores the action popup', async ({
      context,
      extensionId,
      page,
      settingsPage,
    }) => {
      await page.goto(`chrome-extension://${extensionId}/index.html`);
      await settingsPage.openSettingsPage();
      await page.getByTestId(SettingsSelectors.ToggleSidePanelMode).click();

      await test.expect.poll(() => getActionPopup(context)).toContain('action-popup.html');
      await test.expect.poll(() => getIsGlobalPanelEnabled(context)).toBe(false);
    });

    test('a request without a gesture shows the in-page action that opens the panel', async ({
      context,
      page,
    }) => {
      await page.evaluate(delay => {
        setTimeout(() => void window.LeatherProvider?.request('getAddresses'), delay);
      }, userActivationExpiryMs);

      const openLeather = page.getByRole('button', { name: 'Open Leather' });
      await test.expect(openLeather).toBeVisible({ timeout: userActivationExpiryMs * 2 });

      const panelPromise = waitForSidePanel(context);
      await openLeather.click();
      const panel = await panelPromise;
      await test.expect(panel.getByTestId(ConnectAccountSelectors.ApproveBtn)).toBeVisible();
    });
  });

  test.describe('without a wallet', () => {
    test('the action popup stays and the panel is disabled', async ({
      context,
      extensionId,
      globalPage,
    }) => {
      await globalPage.setupAndUseApiCalls(extensionId);

      await test.expect.poll(() => getActionPopup(context)).toContain('action-popup.html');
      await test.expect.poll(() => getIsGlobalPanelEnabled(context)).toBe(false);
    });
  });
});
