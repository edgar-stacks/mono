import { expect } from '@playwright/test';
import {
  type BiometricAuthenticator,
  addBiometricAuthenticator,
} from '@tests/fixtures/biometric-authenticator';
import { TEST_ACCOUNT_SECRET_KEY } from '@tests/page-object-models/onboarding.page';
import { SwitchAccountPage } from '@tests/page-object-models/switch-account.page';
import { OnboardingSelectors } from '@tests/selectors/onboarding.selectors';
import { SettingsSelectors } from '@tests/selectors/settings.selectors';
import { z } from 'zod';

import { test } from '../../fixtures/fixtures';

const persistedSoftwareKeysSchema = z.object({
  softwareKeys: z.looseObject({
    ids: z.array(z.string()),
    authenticationMode: z.literal('biometric-only'),
    platformUnlock: z.looseObject({ version: z.literal(1), credentialId: z.string() }),
  }),
});

let authenticator: BiometricAuthenticator;

test.describe('Biometric unlock', () => {
  test.beforeEach(async ({ extensionId, globalPage, page }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
    authenticator = await addBiometricAuthenticator(page);
  });

  test.afterEach(async () => {
    await authenticator.remove();
  });

  test('that a password profile stays password-only', async ({
    extensionId,
    homePage,
    onboardingPage,
    page,
  }) => {
    await onboardingPage.signInWithTestAccount(extensionId);

    const switchAccountPage = new SwitchAccountPage(page);
    await switchAccountPage.open();
    await switchAccountPage.createNewWallet();
    await page.getByTestId(OnboardingSelectors.BackUpSecretKeyBtn).click();
    await expect(page.getByTestId(OnboardingSelectors.NewPasswordInput)).toBeVisible();
    await expect(page.getByTestId(OnboardingSelectors.BiometricSetupBtn)).toHaveCount(0);

    await page.goto(`chrome-extension://${extensionId}/index.html`);
    await homePage.lock();
    await expect(page.getByTestId(SettingsSelectors.EnterPasswordInput)).toBeVisible();
    await expect(page.getByTestId(SettingsSelectors.BiometricUnlockBtn)).toHaveCount(0);
  });

  test('that a new biometric-only profile unlocks with biometrics and signs out with a disclosure', async ({
    homePage,
    onboardingPage,
    page,
  }) => {
    test.slow();
    await page.getByTestId(OnboardingSelectors.SignUpBtn).click();
    await page.getByTestId(OnboardingSelectors.BackUpSecretKeyBtn).click();
    await expect(page.getByText('Choose how to unlock Leather', { exact: true })).toBeVisible();
    await expect(page.getByTestId(OnboardingSelectors.BiometricSetupBtn)).toHaveText(
      'Use biometrics'
    );
    await onboardingPage.chooseBiometricUnlock();
    await onboardingPage.dismissFeatureIntroducer();

    const { encryptionKey } = await page.evaluate(() =>
      chrome.storage.session.get<{ encryptionKey?: string }>(['encryptionKey'])
    );
    expect(encryptionKey).toMatch(/^[0-9a-f]{96}$/);
    const persisted = await page.evaluate(() => chrome.storage.local.get(null));
    expect(JSON.stringify(persisted)).not.toContain(encryptionKey);
    const persistedRoot = persistedSoftwareKeysSchema.parse(persisted['persist:root']);
    expect(persistedRoot.softwareKeys).not.toHaveProperty('salt');

    await homePage.lock();
    await expect(page.getByText('Unlock Leather', { exact: true })).toBeVisible();
    await expect(page.getByTestId(SettingsSelectors.EnterPasswordInput)).toHaveCount(0);
    await expect(page.getByTestId(SettingsSelectors.BiometricUnlockBtn)).toHaveText(
      'Unlock with biometrics'
    );
    await expect(page.getByTestId(SettingsSelectors.BiometricRecoveryLink)).toHaveText(
      "Can't use biometrics?"
    );
    await homePage.unlockWithBiometrics();
    await homePage.waitForHomePageReady();

    await homePage.clickSettingsButton();
    await homePage.signOutSettingsListItem.click();
    await expect(
      page.getByText(
        'I understand that biometric unlock will not give me access to my wallet after I sign out.',
        { exact: true }
      )
    ).toBeVisible();
    await expect(homePage.signOutDeleteWalletBtn).toBeDisabled();
    await homePage.signOutConfirmHasBackupCheckbox.click();
    await homePage.signOutConfirmPasswordDisable.click();
    await homePage.signOutDeleteWalletBtn.click();

    await page.waitForURL('**/get-started');
    await expect(page.getByTestId(OnboardingSelectors.SignUpBtn)).toBeVisible();
  });

  test('that restoring a wallet offers biometrics instead of a password', async ({
    onboardingPage,
    page,
  }) => {
    await onboardingPage.signInMnemonicKey();
    await page.getByTestId(OnboardingSelectors.SignInBtn).click();
    await expect(page.getByTestId(OnboardingSelectors.BiometricSetupBtn)).toHaveText(
      'Use biometrics instead'
    );
    await onboardingPage.chooseBiometricUnlock();

    const persisted = await page.evaluate(() => chrome.storage.local.get(['persist:root']));
    const persistedRoot = persistedSoftwareKeysSchema.parse(persisted['persist:root']);
    expect(persistedRoot.softwareKeys.ids).toHaveLength(1);
  });

  test('that a second wallet is added with biometrics', async ({ onboardingPage, page }) => {
    test.slow();
    await onboardingPage.signUpNewUserWithBiometrics();

    const switchAccountPage = new SwitchAccountPage(page);
    await switchAccountPage.open();
    await switchAccountPage.openAddWalletMenu();
    await switchAccountPage.clickMenuItem('Restore wallet');
    await onboardingPage.enterMnemonicKey(TEST_ACCOUNT_SECRET_KEY);
    await page.getByTestId(OnboardingSelectors.SignInBtn).click();

    await expect(page.getByText("Confirm it's you", { exact: true })).toBeVisible();
    await expect(page.getByTestId(OnboardingSelectors.NewPasswordInput)).toHaveCount(0);
    await page.getByTestId(SettingsSelectors.BiometricUnlockBtn).click();
    await page.getByTestId(SettingsSelectors.CurrentAccountDisplayName).waitFor();

    await expect
      .poll(async () => {
        const persisted = await page.evaluate(() => chrome.storage.local.get(['persist:root']));
        const result = persistedSoftwareKeysSchema.safeParse(persisted['persist:root']);
        return result.success ? result.data.softwareKeys.ids.length : 0;
      })
      .toBe(2);
  });
});
