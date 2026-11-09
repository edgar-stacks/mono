import { generateMnemonic, getMnemonicRootKeyFingerprint } from '@leather.io/crypto';

import { BiometricUnlockError } from '@shared/biometric-unlock/biometric-unlock-error';
import {
  encodeBase64Url,
  generatePrfInput,
  generateRegistrationTag,
  generateWalletEncryptionKey,
  wrapWalletEncryptionKey,
} from '@shared/crypto/platform-unlock';

import {
  decryptSoftwareKeysWithEncryptionKey,
  encryptSecretKeyWithEncryptionKey,
  readPersistedRoot,
  readValidatedAuthentication,
  readValidatedBiometricAuthentication,
  unwrapBiometricEncryptionKey,
} from './wallet-authentication';

async function createBiometricProfile() {
  const encryptionKey = generateWalletEncryptionKey();
  const prfOutput = crypto.getRandomValues(new Uint8Array(32));
  const platformUnlock = await wrapWalletEncryptionKey({
    encryptionKey,
    prfOutput,
    credentialId: encodeBase64Url(crypto.getRandomValues(new Uint8Array(32))),
    prfInput: encodeBase64Url(generatePrfInput()),
    registrationTag: generateRegistrationTag(),
  });
  const mnemonic = generateMnemonic();
  const fingerprint = getMnemonicRootKeyFingerprint(mnemonic);
  const encryptedSecretKey = await encryptSecretKeyWithEncryptionKey(mnemonic, encryptionKey);
  const softwareKeys = {
    ids: [fingerprint],
    entities: { [fingerprint]: { type: 'software', id: fingerprint, encryptedSecretKey } },
    authenticationMode: 'biometric-only',
    platformUnlock,
  };
  return { encryptionKey, prfOutput, platformUnlock, mnemonic, fingerprint, softwareKeys };
}

async function expectCategory(promise: Promise<unknown>, category: string) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(BiometricUnlockError);
  expect(error).toHaveProperty('category', category);
}

describe('wallet authentication', () => {
  test('reads the persisted root from local storage', async () => {
    await chrome.storage.local.set({ 'persist:root': { softwareKeys: { ids: [] } } });
    await expect(readPersistedRoot()).resolves.toEqual({ softwareKeys: { ids: [] } });
  });

  describe(readValidatedBiometricAuthentication.name, () => {
    test('accepts matching in-memory and persisted biometric state', async () => {
      const { softwareKeys, platformUnlock } = await createBiometricProfile();
      const authentication = await readValidatedBiometricAuthentication({
        softwareKeysState: softwareKeys,
        readPersistedRoot: () => Promise.resolve({ softwareKeys }),
      });
      expect(authentication.platformUnlock).toEqual(platformUnlock);
    });

    test('fails closed when the persisted state differs', async () => {
      const { softwareKeys } = await createBiometricProfile();
      const other = await createBiometricProfile();
      await expectCategory(
        readValidatedBiometricAuthentication({
          softwareKeysState: softwareKeys,
          readPersistedRoot: () => Promise.resolve({ softwareKeys: other.softwareKeys }),
        }),
        'invalid-config'
      );
    });

    test('fails closed when the persisted state is missing or malformed', async () => {
      const { softwareKeys } = await createBiometricProfile();
      await expectCategory(
        readValidatedBiometricAuthentication({
          softwareKeysState: softwareKeys,
          readPersistedRoot: () => Promise.resolve(null),
        }),
        'invalid-config'
      );
      const malformed = { ...softwareKeys, salt: 'salt' };
      await expectCategory(
        readValidatedBiometricAuthentication({
          softwareKeysState: malformed,
          readPersistedRoot: () => Promise.resolve({ softwareKeys: malformed }),
        }),
        'invalid-config'
      );
    });

    test('fails for a password profile', async () => {
      const passwordKeys = { ids: [], entities: {} };
      await expect(
        readValidatedAuthentication({
          softwareKeysState: passwordKeys,
          readPersistedRoot: () => Promise.resolve({ softwareKeys: passwordKeys }),
        })
      ).resolves.toEqual({ mode: 'none' });
      await expectCategory(
        readValidatedBiometricAuthentication({
          softwareKeysState: passwordKeys,
          readPersistedRoot: () => Promise.resolve({ softwareKeys: passwordKeys }),
        }),
        'invalid-config'
      );
    });
  });

  describe(unwrapBiometricEncryptionKey.name, () => {
    test('unwraps with the enrolled PRF output', async () => {
      const { platformUnlock, prfOutput, encryptionKey } = await createBiometricProfile();
      await expect(unwrapBiometricEncryptionKey({ platformUnlock, prfOutput })).resolves.toEqual(
        encryptionKey
      );
    });

    test('reports a credential mismatch for another PRF output', async () => {
      const { platformUnlock } = await createBiometricProfile();
      await expectCategory(
        unwrapBiometricEncryptionKey({
          platformUnlock,
          prfOutput: crypto.getRandomValues(new Uint8Array(32)),
        }),
        'credential-mismatch'
      );
    });
  });

  describe(decryptSoftwareKeysWithEncryptionKey.name, () => {
    test('decrypts and validates every wallet', async () => {
      const { encryptionKey, mnemonic, fingerprint, softwareKeys } = await createBiometricProfile();
      const entity = softwareKeys.entities[fingerprint];
      await expect(decryptSoftwareKeysWithEncryptionKey([entity], encryptionKey)).resolves.toEqual([
        { fingerprint, secretKey: mnemonic },
      ]);
    });

    test('fails wallet validation for the wrong key or fingerprint', async () => {
      const { fingerprint, softwareKeys, encryptionKey } = await createBiometricProfile();
      const entity = softwareKeys.entities[fingerprint];
      await expectCategory(
        decryptSoftwareKeysWithEncryptionKey([entity], generateWalletEncryptionKey()),
        'wallet-validation'
      );
      await expectCategory(
        decryptSoftwareKeysWithEncryptionKey([{ ...entity, id: 'ffffffff' }], encryptionKey),
        'wallet-validation'
      );
      await expectCategory(
        decryptSoftwareKeysWithEncryptionKey([entity], 'not-a-key'),
        'wallet-validation'
      );
    });
  });
});
