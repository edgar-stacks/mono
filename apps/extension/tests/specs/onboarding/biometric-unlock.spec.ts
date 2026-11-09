import { type Page, expect } from '@playwright/test';
import { addVirtualBiometricAuthenticator } from '@tests/fixtures/biometric-authenticator';
import { TEST_ACCOUNT_SECRET_KEY } from '@tests/page-object-models/onboarding.page';
import { HomePageSelectors } from '@tests/selectors/home.selectors';
import { OnboardingSelectors } from '@tests/selectors/onboarding.selectors';
import { SettingsSelectors } from '@tests/selectors/settings.selectors';
import { z } from 'zod';

import { RouteUrls } from '@shared/route-urls';

import { test } from '../../fixtures/fixtures';

const persistedSoftwareKeysSchema = z.looseObject({
  softwareKeys: z.looseObject({
    ids: z.array(z.string()),
    salt: z.string().optional(),
    authenticationMode: z.string().optional(),
    platformUnlock: z.looseObject({ credentialId: z.string() }).optional(),
  }),
});

const biometricSignOutDisclosure =
  'I understand that biometric unlock will not give me access to my wallet after I sign out.';

async function readPersistedRoot(page: Page) {
  return page.evaluate(async () => {
    const stored = await chrome.storage.local.get(['persist:root']);
    return JSON.stringify(stored['persist:root'] ?? null);
  });
}

async function readSessionKey(page: Page) {
  return page.evaluate(async () => {
    const { encryptionKey } = await chrome.storage.session.get<{ encryptionKey?: string }>(
      'encryptionKey'
    );
    return encryptionKey ?? '';
  });
}

async function readPersistedSoftwareKeys(page: Page) {
  return persistedSoftwareKeysSchema.parse(JSON.parse(await readPersistedRoot(page))).softwareKeys;
}

test.describe('Biometric unlock', () => {
  test.beforeEach(async ({ extensionId, globalPage, page }) => {
    await globalPage.setupAndUseApiCalls(extensionId);
    await addVirtualBiometricAuthenticator(page);
  });

  test('a password profile stays password-only', async ({ homePage, onboardingPage, page }) => {
    await onboardingPage.signUpNewUser();

    const softwareKeys = await readPersistedSoftwareKeys(page);
    expect(softwareKeys.authenticationMode).toBe('password');
    expect(softwareKeys.platformUnlock).toBeUndefined();

    await homePage.lock();
    await expect(page.getByTestId(SettingsSelectors.EnterPasswordInput)).toBeVisible();
    await expect(page.getByTestId(SettingsSelectors.BiometricUnlockBtn)).toHaveCount(0);
    await expect(page.getByTestId(SettingsSelectors.BiometricRecoveryLink)).toHaveCount(0);
  });

  test('creates and unlocks a biometric-only profile', async ({
    homePage,
    onboardingPage,
    page,
  }) => {
    await onboardingPage.signUpNewUserWithBiometrics();

    const sessionKey = await readSessionKey(page);
    expect(sessionKey).toMatch(/^[0-9a-f]{96}$/);
    expect(await readPersistedRoot(page)).not.toContain(sessionKey);
    const softwareKeys = await readPersistedSoftwareKeys(page);
    expect(softwareKeys.authenticationMode).toBe('biometric-only');
    expect(softwareKeys.salt).toBeUndefined();
    expect(softwareKeys.platformUnlock?.credentialId).toBeTruthy();

    await homePage.lock();
    await expect(page.getByText('Unlock Leather', { exact: true })).toBeVisible();
    await expect(page.getByTestId(SettingsSelectors.EnterPasswordInput)).toHaveCount(0);
    await expect(page.getByTestId(SettingsSelectors.BiometricRecoveryLink)).toHaveText(
      "Can't use biometrics?"
    );
    await expect(page.getByTestId(SettingsSelectors.BiometricUnlockBtn)).toHaveText(
      'Unlock with biometrics'
    );

    await homePage.unlockWithBiometrics();
    await expect(page.getByTestId(HomePageSelectors.HomePageContainer)).toBeVisible();
    await expect.poll(() => readSessionKey(page)).toBe(sessionKey);

    await homePage.clickSettingsButton();
    await homePage.signOutSettingsListItem.click();
    await expect(page.getByText(biometricSignOutDisclosure, { exact: true })).toBeVisible();
    await homePage.signOutConfirmHasBackupCheckbox.check();
    await expect(homePage.signOutDeleteWalletBtn).toBeDisabled();
    await homePage.signOutConfirmPasswordDisable.click();
    await homePage.signOutDeleteWalletBtn.click();

    await page.waitForURL('**/get-started');
    await expect(page.getByTestId(OnboardingSelectors.SignUpBtn)).toBeVisible();
  });

  test('offers biometrics when restoring a wallet', async ({ onboardingPage, page }) => {
    await onboardingPage.signInMnemonicKey();
    await page.getByTestId(OnboardingSelectors.SignInBtn).click();

    await expect(page.getByText('Choose how to unlock Leather', { exact: true })).toBeVisible();
    await expect(page.getByTestId(OnboardingSelectors.BiometricSetupBtn)).toHaveText(
      'Use biometrics instead'
    );
    await onboardingPage.chooseBiometricUnlock();

    const softwareKeys = await readPersistedSoftwareKeys(page);
    expect(softwareKeys.authenticationMode).toBe('biometric-only');
    expect(softwareKeys.ids).toHaveLength(1);
  });

  test('adds a second wallet with biometrics', async ({ extensionId, onboardingPage, page }) => {
    await onboardingPage.signUpNewUserWithBiometrics();
    const sessionKey = await readSessionKey(page);

    await page.goto(`chrome-extension://${extensionId}/index.html#${RouteUrls.AddWallet}`);
    await onboardingPage.enterMnemonicKey(TEST_ACCOUNT_SECRET_KEY);
    await page.getByTestId(OnboardingSelectors.SignInBtn).click();

    await expect(page.getByText("Confirm it's you", { exact: true })).toBeVisible();
    await expect(page.getByTestId(OnboardingSelectors.NewPasswordInput)).toHaveCount(0);
    await page.getByTestId(SettingsSelectors.BiometricUnlockBtn).click();
    await page.getByTestId(HomePageSelectors.HomePageContainer).waitFor();

    await expect.poll(async () => (await readPersistedSoftwareKeys(page)).ids).toHaveLength(2);
    const softwareKeys = await readPersistedSoftwareKeys(page);
    expect(softwareKeys.authenticationMode).toBe('biometric-only');
    expect(await readSessionKey(page)).toBe(sessionKey);
  });
});
