import { decryptMnemonic as decrypt } from '@stacks/encryption';
import { AddressVersion } from '@stacks/transactions';

import {
  deriveRootKeychainFromMnemonicSync,
  getMnemonicRootKeyFingerprint,
} from '@leather.io/crypto';
import {
  type getBnsV2ApiClient,
  type getHiroStacksApiClient,
  type getLeatherApiClient,
} from '@leather.io/services';
import { fingerprintMigration, userAddsWallet, userRemovesWallet } from '@leather.io/state/wallet';
import { isDefined, secondsInMs } from '@leather.io/utils';

import { deriveEncryptionKey } from '@shared/crypto/generate-encryption-key';
import {
  decryptMnemonic,
  encryptMnemonic,
  encryptMnemonicWithEncryptionKey,
} from '@shared/crypto/mnemonic-encryption';
import { PlatformUnlockError } from '@shared/crypto/platform-authenticator';
import { logger } from '@shared/logger';
import { broadcastWalletListChanged } from '@shared/messages';
import { assumedZeroFingerprint } from '@shared/utils';
import { identifyUser } from '@shared/utils/analytics';

import { recurseAccountsForActivity } from '@app/common/account-restoration/account-restore';
import { getWalletSessionKey, initalizeWalletSession } from '@app/store/session-restore';
import { type AppThunk, persistor } from '@app/store/store';

import { getNativeSegwitMainnetAddressFromRootKeychain } from '../accounts/blockchain/bitcoin/native-segwit-account.hooks';
import { getTaprootMainnetAddressFromRootKeychain } from '../accounts/blockchain/bitcoin/taproot-account.hooks';
import { getStacksAddressByIndex } from '../accounts/blockchain/stacks/stacks-keychain';
import { walletKeyGenerated } from '../active/active.slice';
import { selectStacksChain } from '../chains/stx-chain.selectors';
import { stxChainSlice } from '../chains/stx-chain.slice';
import * as inMemoryStore from '../in-memory-key/in-memory-storage';
import { selectAllWallets, selectWalletEntities } from '../wallets/wallet.selectors';
import { parseSoftwareKeyAuthentication } from './software-key-state';
import { selectSoftwareKeys, selectWalletSalt } from './software-key.selectors';
import { keySlice } from './software-key.slice';
import { checkPassword } from './utils';
import {
  assertNoPersistedSoftwareKeys,
  assertPersistedSoftwareKeysMatch,
  enrollPlatformUnlock,
  getBiometricPlatformUnlock,
  isSameSoftwareKeysState,
  readPersistedSoftwareKeys,
  unlockPlatformEncryptionKey,
} from './wallet-authentication';
import { withWalletWriteLock } from './wallet-write-lock';

interface AccountDiscoveryClients {
  leatherApiClient: Pick<
    ReturnType<typeof getLeatherApiClient>,
    'fetchUtxosByAddress' | 'fetchBitcoinTransactionsByAddress'
  >;
  hiroClient: Pick<
    ReturnType<typeof getHiroStacksApiClient>,
    'getAddressStxBalance' | 'getAddressTransactions'
  >;
  bnsClient: Pick<ReturnType<typeof getBnsV2ApiClient>, 'fetchAddressBnsNames'>;
}

interface AccountActivityCheckerArgs extends AccountDiscoveryClients {
  mnemonic: string;
}

const nextAccountProbeInFlight = new Set<string>();
const recursiveDiscoveryInFlight = new Set<string>();
const accountActivityRequestTimeoutMs = secondsInMs(5);

function validHighestAccountIndex(index: number | undefined) {
  return typeof index === 'number' && Number.isInteger(index) && index >= 0 ? index : 0;
}

function createAccountActivityChecker({
  bnsClient,
  hiroClient,
  leatherApiClient,
  mnemonic,
}: AccountActivityCheckerArgs) {
  const rootKeychain = deriveRootKeychainFromMnemonicSync(mnemonic);
  const deriveStacksAddress = getStacksAddressByIndex(
    rootKeychain,
    AddressVersion.MainnetSingleSig
  );
  const deriveNativeSegwitAddress = getNativeSegwitMainnetAddressFromRootKeychain(rootKeychain);
  const deriveTaprootAddress = getTaprootMainnetAddressFromRootKeychain(rootKeychain);

  async function doesStacksAddressHaveBalance(address: string, signal: AbortSignal) {
    const resp = await hiroClient.getAddressStxBalance(address, { signal });
    return Number(resp.balance) > 0;
  }

  async function doesStacksAddressHaveBnsName(address: string, signal: AbortSignal) {
    const resp = await bnsClient.fetchAddressBnsNames(address, { signal });
    return resp.names.length > 0;
  }

  async function doesStacksAddressHaveTransactionHistory(address: string, signal: AbortSignal) {
    const resp = await hiroClient.getAddressTransactions(address, { pages: 1 }, { signal });
    return resp.length > 0;
  }

  async function doesBitcoinAddressHaveBalance(address: string, signal: AbortSignal) {
    const resp = await leatherApiClient.fetchUtxosByAddress(address, { signal });
    return resp.length > 0;
  }

  async function doesBitcoinAddressHaveTransactionHistory(address: string, signal: AbortSignal) {
    const resp = await leatherApiClient.fetchBitcoinTransactionsByAddress(
      address,
      { page: 1, pageSize: 1 },
      { signal }
    );
    return resp.data.length > 0;
  }

  return async function doesAccountHaveActivity(index: number) {
    const signal = AbortSignal.timeout(accountActivityRequestTimeoutMs);
    const stxAddress = deriveStacksAddress(index);
    const btcAddresses = [deriveNativeSegwitAddress(index), deriveTaprootAddress(index)].filter(
      isDefined
    );

    const results = await Promise.allSettled([
      doesStacksAddressHaveBalance(stxAddress, signal),
      doesStacksAddressHaveBnsName(stxAddress, signal),
      doesStacksAddressHaveTransactionHistory(stxAddress, signal),
      ...btcAddresses.flatMap(address => [
        doesBitcoinAddressHaveBalance(address, signal),
        doesBitcoinAddressHaveTransactionHistory(address, signal),
      ]),
    ]);

    const rejectedCount = results.filter(result => result.status === 'rejected').length;
    if (rejectedCount) {
      logger.warn('Account activity lookup checks failed', {
        accountIndex: index,
        rejectedCount,
      });
    }

    if (results.every(result => result.status === 'rejected')) {
      throw new Error('All account activity lookup checks failed');
    }

    return results.some(result => result.status === 'fulfilled' && result.value);
  };
}

function startRecursiveAccountDiscovery({
  dispatch,
  doesAddressHaveActivityFn,
  fingerprint,
  fromAccountIndex,
}: {
  dispatch(action: ReturnType<typeof stxChainSlice.actions.restoreAccountIndex>): void;
  doesAddressHaveActivityFn: ReturnType<typeof createAccountActivityChecker>;
  fingerprint: string;
  fromAccountIndex: number;
}) {
  if (recursiveDiscoveryInFlight.has(fingerprint)) return;
  recursiveDiscoveryInFlight.add(fingerprint);

  logger.info('Initiating recursive account activity lookup');
  const start = performance.now();

  function persistDiscoveredAccountIndex(accountIndex: number) {
    dispatch(stxChainSlice.actions.restoreAccountIndex({ fingerprint, accountIndex }));
    void persistor.flush();
  }

  async function discoverAccounts() {
    const recursiveActivityIndex = await recurseAccountsForActivity({
      doesAddressHaveActivityFn,
      fromAccountIndex,
      onActivityFound: persistDiscoveredAccountIndex,
    });
    const end = performance.now();
    logger.info('Found account activity at higher index', {
      recursiveActivityIndex,
      time: (end - start) / 1000 + ' seconds',
    });
  }

  void discoverAccounts()
    .catch((error: unknown) => {
      logger.warn('Account activity lookup failed', { error });
    })
    .finally(() => {
      recursiveDiscoveryInFlight.delete(fingerprint);
    });
}

function probeNextAccountAndDiscoverAccounts(clients: AccountDiscoveryClients): AppThunk {
  return async (dispatch, getState) => {
    const state = getState();
    const stxChain = selectStacksChain(state);
    const softwareWallets = selectAllWallets(state).filter(wallet => wallet.type === 'software');

    await Promise.all(
      softwareWallets.map(async wallet => {
        const { fingerprint } = wallet;
        if (nextAccountProbeInFlight.has(fingerprint)) return;
        if (recursiveDiscoveryInFlight.has(fingerprint)) return;

        const mnemonic = inMemoryStore.getKey(fingerprint);
        if (!mnemonic) return;

        nextAccountProbeInFlight.add(fingerprint);
        try {
          const highestAccountIndex = validHighestAccountIndex(
            stxChain[fingerprint]?.highestAccountIndex
          );
          const nextAccountIndex = highestAccountIndex + 1;
          const doesAddressHaveActivityFn = createAccountActivityChecker({ ...clients, mnemonic });
          const hasActivity = await doesAddressHaveActivityFn(nextAccountIndex);

          if (!hasActivity) return;

          startRecursiveAccountDiscovery({
            dispatch,
            doesAddressHaveActivityFn,
            fingerprint,
            fromAccountIndex: highestAccountIndex,
          });
        } catch (error) {
          logger.warn('Next account activity probe failed', { error, fingerprint });
        } finally {
          nextAccountProbeInFlight.delete(fingerprint);
        }
      })
    );
  };
}

function setWalletEncryptionPassword(
  args: {
    password: string;
    mnemonic: string;
    fingerprint: string;
  } & AccountDiscoveryClients
): AppThunk {
  const { password, mnemonic, fingerprint, leatherApiClient, hiroClient, bnsClient } = args;

  return async (dispatch, getState) =>
    withWalletWriteLock(async () => {
      if (parseSoftwareKeyAuthentication(getState().softwareKeys)?.mode === 'biometric-only')
        throw new Error('Password unlock is not enabled for this profile');
      const persistedSoftwareKeys = await readPersistedSoftwareKeys();
      if (parseSoftwareKeyAuthentication(persistedSoftwareKeys)?.mode === 'biometric-only')
        throw new Error('Password unlock is not enabled for this profile');

      const softwareKeys = selectSoftwareKeys(getState());
      const hasSoftwareKeys = softwareKeys.length > 0;

      const existingSalt = hasSoftwareKeys ? selectWalletSalt(getState()) : undefined;

      const existingEncryptionKey = hasSoftwareKeys
        ? (await getWalletSessionKey()).data
        : undefined;

      if (hasSoftwareKeys) {
        if (!existingSalt || !existingEncryptionKey)
          throw new Error("Can't find salt or encryption key");

        const isCorrectPassword = await checkPassword({
          password,
          salt: existingSalt,
          encryptionKey: existingEncryptionKey,
        });

        if (!isCorrectPassword) {
          throw new Error("The password doesn't match");
        }
      }

      const { encryptedSecretKey, encryptionKey, salt } = await encryptMnemonic({
        secretKey: mnemonic,
        password,
        existingEncryptionKey,
        existingSalt,
      });

      await initalizeWalletSession(encryptionKey);

      inMemoryStore.setKey(fingerprint, mnemonic);

      // Multi-wallet structure
      dispatch(
        userAddsWallet({
          wallet: {
            createdOn: new Date().toISOString(),
            fingerprint,
            type: 'software',
          },
          accountKeychains: [],
        })
      );

      // Single wallet key slice structure
      dispatch(
        keySlice.actions.createSoftwareWalletComplete({
          salt,
          key: {
            type: 'software',
            id: fingerprint,
            encryptedSecretKey,
          },
        })
      );

      dispatch(walletKeyGenerated(fingerprint));

      await persistor.flush();
      void broadcastWalletListChanged({});

      // Performs a recursive check for account activity. When activity is found
      // at a higher index than what is found on Gaia (long-term wallet users), we
      // update the highest known account index that the wallet generates. This
      // action is performed outside this Promise's execution, as it may be slow,
      // and the user shouldn't have to wait before being directed to homepage.
      startRecursiveAccountDiscovery({
        dispatch,
        doesAddressHaveActivityFn: createAccountActivityChecker({
          bnsClient,
          hiroClient,
          leatherApiClient,
          mnemonic,
        }),
        fingerprint,
        fromAccountIndex: 0,
      });
    });
}

function unlockWalletAction(password: string): AppThunk {
  return async (dispatch, getState) => {
    const state = getState();
    const salt = selectWalletSalt(state);
    const softwareKeys = selectSoftwareKeys(state);

    const existingEncryptionKey = salt ? await deriveEncryptionKey({ password, salt }) : undefined;

    const decryptedResults = await Promise.all(
      softwareKeys.map(key =>
        decryptMnemonic({
          password,
          encryptedSecretKey: key.encryptedSecretKey,
          salt,
          existingEncryptionKey,
        })
      )
    );

    function requiresFingerprintMigration() {
      return softwareKeys.length === 1 && softwareKeys[0].id === assumedZeroFingerprint;
    }

    if (requiresFingerprintMigration()) {
      const { fingerprint } = decryptedResults[0];

      dispatch(fingerprintMigration(fingerprint));

      const walletEntities = selectWalletEntities(state);
      const oldWallet = walletEntities[assumedZeroFingerprint];

      if (oldWallet) {
        dispatch(userRemovesWallet({ fingerprint: assumedZeroFingerprint }));
        dispatch(
          userAddsWallet({
            wallet: { ...oldWallet, fingerprint },
            accountKeychains: [],
          })
        );
      }
    }

    // Pre-Argon2 / vault-migrated wallets have no top-level salt, so decryptMnemonic
    // took its legacy path and re-encrypted the key with a freshly generated Argon2
    // salt. Persist that salt and re-encrypted key here, otherwise selectWalletSalt
    // stays undefined and the add-wallet password check (useCheckPassword) can never
    // pass for these users.
    if (!salt) {
      const reEncrypted = decryptedResults[0];
      dispatch(
        keySlice.actions.softwareKeyReEncrypted({
          salt: reEncrypted.salt,
          key: {
            type: 'software',
            id: reEncrypted.fingerprint,
            encryptedSecretKey: reEncrypted.encryptedSecretKey,
          },
        })
      );
      await persistor.flush();
    }

    await initalizeWalletSession(decryptedResults[0].encryptionKey);

    for (const { fingerprint, secretKey } of decryptedResults) {
      inMemoryStore.setKey(fingerprint, secretKey);
    }

    const firstDecryptedResult = decryptedResults[0];

    if (firstDecryptedResult) {
      const rootKey = deriveRootKeychainFromMnemonicSync(firstDecryptedResult.secretKey);
      if (!rootKey.publicKey) throw new Error('Could not derive root key from mnemonic');
      void identifyUser(rootKey.publicKey);
    }
  };
}

interface BiometricWalletArgs extends AccountDiscoveryClients {
  mnemonic: string;
  fingerprint: string;
}

async function decryptSoftwareKeysWithEncryptionKey(
  softwareKeys: ReturnType<typeof selectSoftwareKeys>,
  encryptionKey: string
) {
  try {
    return await Promise.all(
      softwareKeys.map(async softwareKey => {
        const secretKey = await decrypt(softwareKey.encryptedSecretKey, encryptionKey);
        if (getMnemonicRootKeyFingerprint(secretKey) !== softwareKey.id)
          throw new Error('Decrypted secret key does not match its wallet');
        return { fingerprint: softwareKey.id, secretKey };
      })
    );
  } catch {
    throw new PlatformUnlockError('wallet-validation');
  }
}

function buildSoftwareWalletAddedAction(fingerprint: string) {
  return userAddsWallet({
    wallet: {
      createdOn: new Date().toISOString(),
      fingerprint,
      type: 'software',
    },
    accountKeychains: [],
  });
}

function createBiometricWallet(args: BiometricWalletArgs): AppThunk {
  const { mnemonic, fingerprint, leatherApiClient, hiroClient, bnsClient } = args;

  return async (dispatch, getState) =>
    withWalletWriteLock(async () => {
      if (parseSoftwareKeyAuthentication(getState().softwareKeys)?.mode !== 'none')
        throw new PlatformUnlockError('wallet-validation');
      await assertNoPersistedSoftwareKeys();

      const { encryptionKey, platformUnlock } = await enrollPlatformUnlock();
      const encryptedSecretKey = await encryptMnemonicWithEncryptionKey(mnemonic, encryptionKey);

      if (parseSoftwareKeyAuthentication(getState().softwareKeys)?.mode !== 'none')
        throw new PlatformUnlockError('wallet-validation');
      await assertNoPersistedSoftwareKeys();

      await initalizeWalletSession(encryptionKey);
      inMemoryStore.setKey(fingerprint, mnemonic);

      dispatch(buildSoftwareWalletAddedAction(fingerprint));
      dispatch(
        keySlice.actions.createBiometricSoftwareWalletComplete({
          platformUnlock,
          key: { type: 'software', id: fingerprint, encryptedSecretKey },
        })
      );
      dispatch(walletKeyGenerated(fingerprint));

      await persistor.flush();
      void broadcastWalletListChanged({});

      startRecursiveAccountDiscovery({
        dispatch,
        doesAddressHaveActivityFn: createAccountActivityChecker({
          bnsClient,
          hiroClient,
          leatherApiClient,
          mnemonic,
        }),
        fingerprint,
        fromAccountIndex: 0,
      });
    });
}

function unlockWalletWithBiometricsAction(): AppThunk {
  return async (_dispatch, getState) => {
    const softwareKeysBefore = getState().softwareKeys;
    const platformUnlock = getBiometricPlatformUnlock(softwareKeysBefore);
    await assertPersistedSoftwareKeysMatch(softwareKeysBefore);

    const encryptionKey = await unlockPlatformEncryptionKey(platformUnlock);
    const decryptedKeys = await decryptSoftwareKeysWithEncryptionKey(
      selectSoftwareKeys(getState()),
      encryptionKey
    );

    const softwareKeysAfter = getState().softwareKeys;
    if (!isSameSoftwareKeysState(softwareKeysBefore, softwareKeysAfter))
      throw new PlatformUnlockError('wallet-validation');
    await assertPersistedSoftwareKeysMatch(softwareKeysAfter);

    await initalizeWalletSession(encryptionKey);
    for (const { fingerprint, secretKey } of decryptedKeys) {
      inMemoryStore.setKey(fingerprint, secretKey);
    }

    const firstDecryptedKey = decryptedKeys[0];
    if (firstDecryptedKey) {
      const rootKey = deriveRootKeychainFromMnemonicSync(firstDecryptedKey.secretKey);
      if (rootKey.publicKey) void identifyUser(rootKey.publicKey);
    }
  };
}

function addWalletWithBiometrics(args: BiometricWalletArgs): AppThunk {
  const { mnemonic, fingerprint, leatherApiClient, hiroClient, bnsClient } = args;

  return async (dispatch, getState) =>
    withWalletWriteLock(async () => {
      const softwareKeysBefore = getState().softwareKeys;
      const platformUnlock = getBiometricPlatformUnlock(softwareKeysBefore);
      await assertPersistedSoftwareKeysMatch(softwareKeysBefore);

      const encryptionKey = await unlockPlatformEncryptionKey(platformUnlock);
      await decryptSoftwareKeysWithEncryptionKey(selectSoftwareKeys(getState()), encryptionKey);

      const sessionKey = await getWalletSessionKey();
      if (sessionKey.success && sessionKey.data !== encryptionKey)
        throw new PlatformUnlockError('wallet-validation');

      const encryptedSecretKey = await encryptMnemonicWithEncryptionKey(mnemonic, encryptionKey);

      const softwareKeysAfter = getState().softwareKeys;
      if (!isSameSoftwareKeysState(softwareKeysBefore, softwareKeysAfter))
        throw new PlatformUnlockError('wallet-validation');
      await assertPersistedSoftwareKeysMatch(softwareKeysAfter);

      await initalizeWalletSession(encryptionKey);
      inMemoryStore.setKey(fingerprint, mnemonic);

      dispatch(buildSoftwareWalletAddedAction(fingerprint));
      dispatch(
        keySlice.actions.biometricSoftwareWalletAdded({
          type: 'software',
          id: fingerprint,
          encryptedSecretKey,
        })
      );
      dispatch(walletKeyGenerated(fingerprint));

      await persistor.flush();
      void broadcastWalletListChanged({});

      startRecursiveAccountDiscovery({
        dispatch,
        doesAddressHaveActivityFn: createAccountActivityChecker({
          bnsClient,
          hiroClient,
          leatherApiClient,
          mnemonic,
        }),
        fingerprint,
        fromAccountIndex: 0,
      });
    });
}

export const keyActions = {
  ...keySlice.actions,
  addWalletWithBiometrics,
  createBiometricWallet,
  probeNextAccountAndDiscoverAccounts,
  setWalletEncryptionPassword,
  unlockWalletAction,
  unlockWalletWithBiometricsAction,
};
