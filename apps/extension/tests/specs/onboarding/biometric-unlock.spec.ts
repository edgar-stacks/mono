import { type Page, expect } from '@playwright/test';
import {
  type BiometricAuthenticator,
  addBiometricAuthenticator,
} from '@tests/fixtures/biometric-authenticator';
import { TEST_ACCOUNT_SECRET_KEY } from '@tests/page-object-models/onboarding.page';
import { OnboardingSelectors } from '@tests/selectors/onboarding.selectors';
import { SettingsSelectors } from '@tests/selectors/settings.selectors';
import { z } from 'zod';

import { generateMnemonic } from '@leather.io/crypto';

import { RouteUrls } from '@shared/route-urls';

import { test } from '../../fixtures/fixtures';

const walletEncryptionKeyPattern = /^[0-9a-f]{96}$/;

const persistedSoftwareKeysSchema = z.looseObject({
  softwareKeys: z.looseObject({
    ids: z.array(z.string()),
    salt: z.string().optional(),
    authenticationMode: z.string().optional(),
    platformUnlock: z.looseObject({ version: z.number(), credentialId: z.string() }).optional(),
  }),
});

const sessionKeySchema = z.object({ encryptionKey: z.string().regex(walletEncryptionKeyPattern) });

function containsWalletEncryptionKey(value: unknown): boolean {
  if (typeof value === 'string') return walletEncryptionKeyPattern.test(value);
  if (Array.isArray(value)) return value.some(containsWalletEncryptionKey);
  if (typeof value === 'object' && value !== null)
    return Object.values(value).some(containsWalletEncryptionKey);
  return false;
}

function readPersistedRoot(page: Page) {
  return page.evaluate(async () => {
    const stored = await chrome.storage.local.get<Record<string, unknown>>(['persist:root']);
    return stored['persist:root'];
  });
}

function readSessionKey(page: Page) {
  return page.evaluate(() => chrome.storage.session.get(['encryptionKey']));
}

async function readSoftwareKeys(page: Page) {
  await expect
    .poll(async () => persistedSoftwareKeysSchema.safeParse(await readPersistedRoot(page)).success)
    .toBe(true);
  return persistedSoftwareKeysSchema.parse(await readPersistedRoot(page)).softwareKeys;
}

test.describe('Biometric unlock', () => {
  let authenticator: BiometricAuthenticator;

  test.beforeEach(async ({ extensionId, globalPage, page }) => {
    authenticator = await addBiometricAuthenticator(page);
    await globalPage.setupAndUseApiCalls(extensionId);
  });

  test.afterEach(async () => {
    await authenticator.remove();
  });

  test('a password profile stays password-only', async ({
    extensionId,
    homePage,
    onboardingPage,
    page,
  }) => {
    await onboardingPage.signInWithTestAccount(extensionId);
    await homePage.lock();

    await expect(page.getByTestId(SettingsSelectors.EnterPasswordInput)).toBeVisible();
    await expect(page.getByTestId(OnboardingSelectors.BiometricUnlockBtn)).toHaveCount(0);

    await homePage.unlock();
    await page.goto(`chrome-extension://${extensionId}/index.html#${RouteUrls.AddWallet}`);
    await onboardingPage.enterMnemonicKey(generateMnemonic());
    await page.getByTestId(OnboardingSelectors.SignInBtn).click();

    await expect(page.getByText('Enter your Password', { exact: true })).toBeVisible();
    await expect(page.getByTestId(OnboardingSelectors.BiometricSetupBtn)).toHaveCount(0);
  });

  test('creates and unlocks a biometric-only profile, then signs out', async ({
    homePage,
    onboardingPage,
    page,
  }) => {
    await expect(page.getByTestId(OnboardingSelectors.SignUpBtn)).toBeVisible();
    await page.getByTestId(OnboardingSelectors.SignUpBtn).click();
    await page.getByTestId(OnboardingSelectors.BackUpSecretKeyBtn).click();

    await expect(page.getByText('Choose how to unlock Leather', { exact: true })).toBeVisible();
    await expect(page.getByTestId(OnboardingSelectors.BiometricSetupBtn)).toHaveText(
      'Use biometrics'
    );
    await onboardingPage.chooseBiometricUnlock();
    await onboardingPage.dismissFeatureIntroducer();

    const softwareKeys = await readSoftwareKeys(page);
    expect(softwareKeys.authenticationMode).toBe('biometric-only');
    expect(softwareKeys.salt).toBeUndefined();
    expect(softwareKeys.platformUnlock?.version).toBe(1);

    const { encryptionKey } = sessionKeySchema.parse(await readSessionKey(page));
    const persistedRoot = await readPersistedRoot(page);
    expect(JSON.stringify(persistedRoot)).not.toContain(encryptionKey);
    expect(containsWalletEncryptionKey(persistedRoot)).toBe(false);

    await homePage.lock();
    await expect(page.getByText('Unlock Leather', { exact: true })).toBeVisible();
    await expect(page.getByText("Can't use biometrics?", { exact: true })).toBeVisible();
    await expect(page.getByTestId(SettingsSelectors.EnterPasswordInput)).toHaveCount(0);
    await expect(page.getByTestId(OnboardingSelectors.BiometricUnlockBtn)).toHaveText(
      'Unlock with biometrics'
    );

    await onboardingPage.unlockWithBiometrics();
    expect(sessionKeySchema.parse(await readSessionKey(page)).encryptionKey).toEqual(encryptionKey);

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
    await expect(homePage.signOutDeleteWalletBtn).toBeDisabled();
    await homePage.signOutConfirmPasswordDisable.click();
    await homePage.signOutDeleteWalletBtn.click();

    await page.waitForURL('**/get-started');
    await expect(page.getByTestId(OnboardingSelectors.SignUpBtn)).toBeVisible();
  });

  test('offers the same choice when restoring a wallet', async ({ onboardingPage, page }) => {
    await onboardingPage.signInMnemonicKey(TEST_ACCOUNT_SECRET_KEY);
    await page.getByTestId(OnboardingSelectors.SignInBtn).click();

    await expect(page.getByText('Choose how to unlock Leather', { exact: true })).toBeVisible();
    await expect(page.getByTestId(OnboardingSelectors.BiometricSetupBtn)).toHaveText(
      'Use biometrics instead'
    );
    await onboardingPage.chooseBiometricUnlock();

    const softwareKeys = await readSoftwareKeys(page);
    expect(softwareKeys.authenticationMode).toBe('biometric-only');
    expect(softwareKeys.ids).toHaveLength(1);
  });

  test('adds a second wallet with biometrics', async ({ extensionId, onboardingPage, page }) => {
    await onboardingPage.signUpNewUserWithBiometrics();

    await page.goto(`chrome-extension://${extensionId}/index.html#${RouteUrls.AddWallet}`);
    await onboardingPage.enterMnemonicKey(TEST_ACCOUNT_SECRET_KEY);
    await page.getByTestId(OnboardingSelectors.SignInBtn).click();

    await expect(page.getByText("Confirm it's you", { exact: true })).toBeVisible();
    await expect(page.getByTestId(OnboardingSelectors.NewPasswordInput)).toHaveCount(0);
    await onboardingPage.unlockWithBiometrics();
    await page.waitForURL('**' + RouteUrls.Home);

    await expect.poll(async () => (await readSoftwareKeys(page)).ids.length).toBe(2);
    const softwareKeys = await readSoftwareKeys(page);
    expect(softwareKeys.authenticationMode).toBe('biometric-only');
    expect(softwareKeys.salt).toBeUndefined();
  });
});
