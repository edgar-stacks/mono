import { type BrowserContext, expect } from '@playwright/test';
import {
  getConnectedTestAppPermissionsState,
  getTestSoftwareAccountDefaultWalletState,
} from '@tests/page-object-models/onboarding.page';
import { HomePageSelectors } from '@tests/selectors/home.selectors';
import { ConnectAccountSelectors } from '@tests/selectors/requests.selectors';
import { SettingsSelectors } from '@tests/selectors/settings.selectors';
import { expectToSettleAt } from '@tests/utils';

import { RouteUrls } from '@shared/route-urls';

import {
  type SidePanelDemo,
  addRequestButton,
  getRequestOverlay,
  panelActionTimeoutMs,
  panelHomeUrl,
  sendRequestOnPageLoad,
  test,
} from './side-panel-demo.fixtures';

const testAddress = 'bc1q530dz4h80kwlzywlhx2qn0k6vdtftd93c499yq';
const userRejectedMessage = 'User rejected request';

const signedInState = {
  ...getConnectedTestAppPermissionsState(),
  settings: {
    ...getTestSoftwareAccountDefaultWalletState().settings,
    seenFeatureIntros: ['multi-wallet-support', 'side-panel-mode'],
  },
};

function approveGetAddressesInPanel(sidePanelDemo: SidePanelDemo) {
  return sidePanelDemo.actInPanel(RouteUrls.RpcGetAddresses, panel =>
    panel.getByTestId(ConnectAccountSelectors.ApproveBtn).click({ timeout: panelActionTimeoutMs })
  );
}

async function openTestApp(context: BrowserContext) {
  const testApp = await context.newPage();
  await testApp.goto('localhost:3000');
  return testApp;
}

test.describe('Side panel mode', () => {
  test.describe('with a wallet', () => {
    test.beforeEach(async ({ extensionId, globalPage, onboardingPage, sidePanelDemo }) => {
      await globalPage.setupAndUseApiCalls(extensionId);
      await onboardingPage.signInWithTestAccount(extensionId, signedInState);
      await sidePanelDemo.waitUntilPanelModeIsActive();
    });

    test('opens Home in the panel at panel size', async ({ context, sidePanelDemo }) => {
      const testApp = await openTestApp(context);
      const openButton = await addRequestButton(testApp, 'open', { mode: 'popup' });
      await openButton.click();

      await sidePanelDemo.actInPanel('tabId=', panel =>
        panel
          .getByTestId(HomePageSelectors.HomePageContainer)
          .waitFor({ timeout: panelActionTimeoutMs })
      );
      const panel = await sidePanelDemo.getPanel('tabId=');
      expect(await panel.evaluate(() => window.innerWidth)).toBeLessThanOrEqual(480);
    });

    test('opens a clicked request in the panel and returns Home on cancel', async ({
      context,
      sidePanelDemo,
    }) => {
      const testApp = await openTestApp(context);
      const signButton = await addRequestButton(testApp, 'signMessage', {
        message: 'test',
        paymentType: 'p2wpkh',
      });
      await signButton.click();

      await expect(getRequestOverlay(testApp)).toContainText('Review signature in Leather');
      await sidePanelDemo.actInPanel(RouteUrls.RpcSignBip322Message, panel =>
        panel.getByText('Cancel', { exact: true }).click({ timeout: panelActionTimeoutMs })
      );

      await expect(signButton).toHaveAttribute('data-response', new RegExp(userRejectedMessage));
      await sidePanelDemo.actInPanel(panelHomeUrl, panel =>
        panel
          .getByTestId(HomePageSelectors.HomePageContainer)
          .waitFor({ timeout: panelActionTimeoutMs })
      );
      await expect(getRequestOverlay(testApp)).toBeHidden();
    });

    test('approves getAddresses in the panel', async ({ context, sidePanelDemo }) => {
      const testApp = await openTestApp(context);
      const getAddressesButton = await addRequestButton(testApp, 'getAddresses');
      await getAddressesButton.click();

      await approveGetAddressesInPanel(sidePanelDemo);

      await expect(getAddressesButton).toHaveAttribute('data-response', new RegExp(testAddress));
      await sidePanelDemo.actInPanel(panelHomeUrl, panel =>
        panel
          .getByTestId(HomePageSelectors.HomePageContainer)
          .waitFor({ timeout: panelActionTimeoutMs })
      );
      await expect(getRequestOverlay(testApp)).toBeHidden();
    });

    test('dismissing the overlay rejects the request and closes the panel', async ({
      context,
      sidePanelDemo,
    }) => {
      const testApp = await openTestApp(context);
      const getAddressesButton = await addRequestButton(testApp, 'getAddresses');
      await getAddressesButton.click();
      await sidePanelDemo.getPanel(RouteUrls.RpcGetAddresses);

      const overlay = getRequestOverlay(testApp);
      await overlay.getByRole('button', { name: 'Dismiss', exact: true }).click();

      await expect(getAddressesButton).toHaveAttribute(
        'data-response',
        new RegExp(userRejectedMessage)
      );
      await expect.poll(() => sidePanelDemo.countOpenPanels()).toBe(0);
    });

    test('hands a request off to a panel sitting at Home', async ({ context, sidePanelDemo }) => {
      const testApp = await openTestApp(context);
      const openButton = await addRequestButton(testApp, 'open', { mode: 'popup' });
      const getAddressesButton = await addRequestButton(testApp, 'getAddresses');
      await openButton.click();
      await sidePanelDemo.actInPanel('tabId=', panel =>
        panel
          .getByTestId(HomePageSelectors.HomePageContainer)
          .waitFor({ timeout: panelActionTimeoutMs })
      );

      await getAddressesButton.click();
      await approveGetAddressesInPanel(sidePanelDemo);

      await expect(getAddressesButton).toHaveAttribute('data-response', new RegExp(testAddress));
    });

    test('turning Sidebar mode off restores the action popup', async ({
      context,
      page,
      settingsPage,
      sidePanelDemo,
    }) => {
      const testApp = await openTestApp(context);
      const openButton = await addRequestButton(testApp, 'open', { mode: 'popup' });
      await openButton.click();
      await sidePanelDemo.getPanel();

      await page.bringToFront();
      await settingsPage.openSettingsPage();
      await page.getByTestId(SettingsSelectors.ToggleSidePanelMode).click();

      await sidePanelDemo.waitUntilActionPopupIsRestored();
      await expect.poll(() => sidePanelDemo.isOpenedOnActionClick()).toBe(false);
      await expect.poll(() => sidePanelDemo.countOpenPanels()).toBe(0);
    });

    test('shows the in-page action for a request without a gesture', async ({
      context,
      sidePanelDemo,
    }) => {
      const testApp = await context.newPage();
      const response = await sendRequestOnPageLoad(testApp, 'getAddresses');

      const overlay = getRequestOverlay(testApp);
      await expect(overlay).toContainText('Connection request waiting');
      await overlay.getByRole('button', { name: 'Open Leather', exact: true }).click();

      await approveGetAddressesInPanel(sidePanelDemo);

      await expect(response).toContainText(testAddress);
      await expect(overlay).toBeHidden();
    });
  });

  test.describe('without a wallet', () => {
    test.beforeEach(async ({ extensionId, globalPage }) => {
      await globalPage.setupAndUseApiCalls(extensionId);
    });

    test('keeps the action popup and disables the panel', async ({ sidePanelDemo }) => {
      await sidePanelDemo.waitUntilActionPopupIsRestored();
      await expectToSettleAt(() => sidePanelDemo.isPanelEnabled(), false);
      await expect.poll(() => sidePanelDemo.isOpenedOnActionClick()).toBe(false);
    });
  });
});
