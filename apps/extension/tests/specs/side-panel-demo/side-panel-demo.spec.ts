import {
  type BrowserContext,
  type CDPSession,
  type Page,
  type Worker,
  expect,
} from '@playwright/test';
import { test } from '@tests/fixtures/fixtures';
import { HomePageSelectors } from '@tests/selectors/home.selectors';
import { ConnectAccountSelectors } from '@tests/selectors/requests.selectors';
import { SettingsSelectors } from '@tests/selectors/settings.selectors';
import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';
import { SidePanelSelectors } from '@tests/selectors/side-panel.selectors';
import { z } from 'zod';

import { assertExistence } from '@leather.io/utils';

const testAppUrl = 'localhost:3000';
const sidePanelWidth = 360;
const sidePanelHeight = 800;
const demoRequestButtonName = 'Request addresses';
const demoRequestKey = 'sidePanelDemoRequest';
const sidePanelTimeout = 20000;

function getServiceWorker(context: BrowserContext) {
  const [serviceWorker] = context.serviceWorkers();
  assertExistence(serviceWorker, 'Expected the extension service worker to be running');
  return serviceWorker;
}

function readToolbarPopup(serviceWorker: Worker) {
  return serviceWorker.evaluate(() => chrome.action.getPopup({}));
}

function readOpensPanelOnActionClick(serviceWorker: Worker) {
  return serviceWorker.evaluate(async () => {
    const behavior = await chrome.sidePanel.getPanelBehavior();
    return behavior.openPanelOnActionClick ?? false;
  });
}

function readIsGlobalPanelEnabled(serviceWorker: Worker) {
  return serviceWorker.evaluate(async () => {
    const options = await chrome.sidePanel.getOptions({});
    return options.enabled ?? false;
  });
}

const evaluateResultSchema = z.object({
  id: z.number(),
  result: z.object({ result: z.object({ value: z.unknown() }) }).optional(),
});

async function findSidePanelTargetId(cdp: CDPSession) {
  const { targetInfos } = await cdp.send('Target.getTargets');
  return targetInfos.find(target => target.url.includes('side-panel.html'))?.targetId;
}

async function evaluateInTarget(cdp: CDPSession, targetId: string, expression: string) {
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: false });
  const requestId = 1;
  const response = new Promise<unknown>(resolve => {
    cdp.on('Target.receivedMessageFromTarget', event => {
      if (event.sessionId !== sessionId) return;
      const message = evaluateResultSchema.safeParse(JSON.parse(event.message));
      if (message.success && message.data.id === requestId)
        resolve(message.data.result?.result.value);
    });
  });
  await cdp.send('Target.sendMessageToTarget', {
    sessionId,
    message: JSON.stringify({
      id: requestId,
      method: 'Runtime.evaluate',
      params: { expression, returnByValue: true },
    }),
  });
  const value = await response;
  await cdp.send('Target.detachFromTarget', { sessionId });
  return value;
}

function clickSoon(elementExpression: string) {
  return `setTimeout(() => ${elementExpression}.click())`;
}

function createSidePanelDriver(cdp: CDPSession) {
  async function evaluate(expression: string) {
    const targetId = await findSidePanelTargetId(cdp);
    if (!targetId) return null;
    return evaluateInTarget(cdp, targetId, expression);
  }

  function hasTestId(testId: string) {
    return evaluate(`Boolean(document.querySelector('[data-testid="${testId}"]'))`);
  }

  async function expectTestIdVisible(testId: string) {
    await expect.poll(() => hasTestId(testId), { timeout: sidePanelTimeout }).toBe(true);
  }

  return {
    expectTestIdVisible,
    async clickTestId(testId: string) {
      await expectTestIdVisible(testId);
      await evaluate(clickSoon(`document.querySelector('[data-testid="${testId}"]')`));
    },
    async clickButton(name: string) {
      const findButton = `[...document.querySelectorAll('button')].find(button => button.textContent.trim() === '${name}')`;
      await expect
        .poll(() => evaluate(`Boolean(${findButton})`), { timeout: sidePanelTimeout })
        .toBe(true);
      await evaluate(clickSoon(findButton));
    },
  };
}
type SidePanelDriver = ReturnType<typeof createSidePanelDriver>;

async function waitForSidePanel(context: BrowserContext): Promise<SidePanelDriver> {
  const browser = context.browser();
  assertExistence(browser, 'Expected the extension browser to be running');
  const cdp = await browser.newBrowserCDPSession();
  await expect.poll(() => findSidePanelTargetId(cdp), { timeout: sidePanelTimeout }).toBeDefined();
  return createSidePanelDriver(cdp);
}

async function dismissSidePanelModeIntroducer(page: Page) {
  const gotItButton = page.getByTestId(SharedComponentsSelectors.SidePanelModeIntroducerGotItBtn);
  await gotItButton.click();
  await gotItButton.waitFor({ state: 'detached' });
}

async function addDemoRequestButton(page: Page) {
  await page.goto(testAppUrl);
  await page.evaluate(
    ({ buttonName, requestKey }) => {
      const button = document.createElement('button');
      button.textContent = buttonName;
      async function settleRequest() {
        try {
          await window.LeatherProvider?.request('getAddresses');
          return 'resolved';
        } catch {
          return 'rejected';
        }
      }
      button.addEventListener('click', () => {
        Reflect.set(window, requestKey, settleRequest());
      });
      document.body.prepend(button);
    },
    { buttonName: demoRequestButtonName, requestKey: demoRequestKey }
  );
  await page.bringToFront();
}

async function clickDemoRequestButton(page: Page) {
  await page.getByRole('button', { name: demoRequestButtonName }).click();
}

function readDemoRequestOutcome(page: Page) {
  return page.evaluate(
    async requestKey => String(await Reflect.get(window, requestKey)),
    demoRequestKey
  );
}

async function requestWithoutUserGesture(page: Page) {
  await page.addInitScript(requestKey => {
    async function settleRequest(provider: NonNullable<typeof window.LeatherProvider>) {
      try {
        await provider.request('getAddresses');
        return 'resolved';
      } catch {
        return 'rejected';
      }
    }
    function requestWhenProviderIsReady() {
      const provider = window.LeatherProvider;
      if (provider) Reflect.set(window, requestKey, settleRequest(provider));
      else setTimeout(requestWhenProviderIsReady, 100);
    }
    window.addEventListener('load', requestWhenProviderIsReady);
  }, demoRequestKey);
  await page.bringToFront();
  await page.goto(testAppUrl);
}

test.describe('Side panel mode', () => {
  test.describe('with a wallet', () => {
    test.beforeEach(async ({ extensionId, globalPage, onboardingPage, page }) => {
      await globalPage.setupAndUseApiCalls(extensionId);
      await onboardingPage.signInWithTestAccount(extensionId);
      await dismissSidePanelModeIntroducer(page);
    });

    test('Home renders at side panel size', async ({ extensionId, page }) => {
      await page.setViewportSize({ width: sidePanelWidth, height: sidePanelHeight });
      await page.goto(`chrome-extension://${extensionId}/side-panel.html`);
      await expect(page.getByTestId(HomePageSelectors.HomePageContainer)).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(sidePanelWidth);
    });

    test('the toolbar icon opens the side panel', async ({ context }) => {
      const serviceWorker = getServiceWorker(context);
      await expect.poll(() => readToolbarPopup(serviceWorker)).toBe('');
      await expect.poll(() => readOpensPanelOnActionClick(serviceWorker)).toBe(true);
    });

    test('a click-gesture request opens in the panel and cancel returns Home', async ({
      context,
      page,
    }) => {
      await addDemoRequestButton(page);
      const [panel] = await Promise.all([waitForSidePanel(context), clickDemoRequestButton(page)]);
      await expect(page.getByTestId(SidePanelSelectors.RequestOverlay)).toBeVisible();
      await panel.expectTestIdVisible(ConnectAccountSelectors.ApproveBtn);

      await panel.clickButton('Deny');

      await panel.expectTestIdVisible(HomePageSelectors.HomePageContainer);
      await expect(page.getByTestId(SidePanelSelectors.RequestOverlay)).toBeHidden();
      await expect.poll(() => readDemoRequestOutcome(page)).toBe('rejected');
    });

    test('getAddresses approves in the panel', async ({ context, page }) => {
      await addDemoRequestButton(page);
      const [panel] = await Promise.all([waitForSidePanel(context), clickDemoRequestButton(page)]);

      await panel.clickTestId(ConnectAccountSelectors.ApproveBtn);

      await expect.poll(() => readDemoRequestOutcome(page)).toBe('resolved');
      await panel.expectTestIdVisible(HomePageSelectors.HomePageContainer);
      await expect(page.getByTestId(SidePanelSelectors.RequestOverlay)).toBeHidden();
    });

    test('a request arriving while the panel sits at Home hands off', async ({ context, page }) => {
      await addDemoRequestButton(page);
      const [panel] = await Promise.all([waitForSidePanel(context), clickDemoRequestButton(page)]);
      await panel.expectTestIdVisible(ConnectAccountSelectors.ApproveBtn);
      await panel.clickButton('Deny');
      await panel.expectTestIdVisible(HomePageSelectors.HomePageContainer);

      await clickDemoRequestButton(page);

      await panel.expectTestIdVisible(ConnectAccountSelectors.ApproveBtn);
      await expect(page.getByTestId(SidePanelSelectors.RequestOverlay)).toBeVisible();
    });

    test('a request without a user gesture shows the in-page action that opens the panel', async ({
      context,
      page,
    }) => {
      await requestWithoutUserGesture(page);
      const openPanelButton = page.getByTestId(SidePanelSelectors.RequestOverlayOpenPanelBtn);
      await expect(openPanelButton).toBeVisible();

      const [panel] = await Promise.all([waitForSidePanel(context), openPanelButton.click()]);

      await panel.expectTestIdVisible(ConnectAccountSelectors.ApproveBtn);
      await expect(openPanelButton).toBeHidden();
    });

    test('dismissing the overlay rejects the request', async ({ context, page }) => {
      await addDemoRequestButton(page);
      await Promise.all([waitForSidePanel(context), clickDemoRequestButton(page)]);

      await page.getByTestId(SidePanelSelectors.RequestOverlayDismissBtn).click();

      await expect.poll(() => readDemoRequestOutcome(page)).toBe('rejected');
    });

    test('turning Sidebar mode off restores the action popup', async ({
      context,
      settingsPage,
    }) => {
      const serviceWorker = getServiceWorker(context);
      await expect.poll(() => readToolbarPopup(serviceWorker)).toBe('');

      await settingsPage.openSettingsPage();
      await settingsPage.page.getByTestId(SettingsSelectors.ToggleSidePanelMode).click();

      await expect.poll(() => readToolbarPopup(serviceWorker)).toContain('action-popup.html');
      await expect.poll(() => readOpensPanelOnActionClick(serviceWorker)).toBe(false);
    });
  });

  test.describe('without a wallet', () => {
    test('keeps the action popup and disables the panel', async ({
      context,
      extensionId,
      globalPage,
    }) => {
      await globalPage.setupAndUseApiCalls(extensionId);
      const serviceWorker = getServiceWorker(context);

      await expect.poll(() => readToolbarPopup(serviceWorker)).toContain('action-popup.html');
      await expect.poll(() => readIsGlobalPanelEnabled(serviceWorker)).toBe(false);
      await expect.poll(() => readOpensPanelOnActionClick(serviceWorker)).toBe(false);
    });
  });
});
