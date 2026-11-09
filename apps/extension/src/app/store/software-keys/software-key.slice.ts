import { type PayloadAction, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import { resetWallet } from '@leather.io/state';
import { fingerprintMigration, userRemovesWallet } from '@leather.io/state/wallet';

import type { PlatformUnlockConfig } from '@shared/crypto/platform-unlock';
import { assumedZeroFingerprint } from '@shared/utils';

import { migrateVaultReducerStoreToNewStateStructure } from '../utils/vault-reducer-migration';
import type { WalletAuthenticationMode } from './software-key-state';

interface SoftwareKeyConfig {
  type: 'software';
  id: string;
  encryptedSecretKey: string;
}
export const keyAdapter = createEntityAdapter<SoftwareKeyConfig>();

interface SoftwareKeysAuthentication {
  salt?: string;
  authenticationMode?: WalletAuthenticationMode;
  platformUnlock?: PlatformUnlockConfig;
}

export const initialKeysState = keyAdapter.getInitialState<SoftwareKeysAuthentication>({});

function clearAuthentication(state: SoftwareKeysAuthentication) {
  delete state.salt;
  delete state.authenticationMode;
  delete state.platformUnlock;
}

function setPasswordAuthentication(state: SoftwareKeysAuthentication, salt: string) {
  delete state.platformUnlock;
  state.authenticationMode = 'password';
  state.salt = salt;
}

export const keySlice = createSlice({
  name: 'softwareKeys',
  initialState: migrateVaultReducerStoreToNewStateStructure(initialKeysState),
  reducers: {
    createSoftwareWalletComplete(
      state,
      action: PayloadAction<{ salt: string; key: SoftwareKeyConfig }>
    ) {
      keyAdapter.upsertOne(state, action.payload.key);
      setPasswordAuthentication(state, action.payload.salt);
    },

    createBiometricWalletComplete(
      state,
      action: PayloadAction<{ platformUnlock: PlatformUnlockConfig; key: SoftwareKeyConfig }>
    ) {
      keyAdapter.upsertOne(state, action.payload.key);
      delete state.salt;
      state.authenticationMode = 'biometric-only';
      state.platformUnlock = action.payload.platformUnlock;
    },

    addNewWallet(state, action: PayloadAction<SoftwareKeyConfig>) {
      keyAdapter.addOne(state, action.payload);
    },

    // Persists the result of re-encrypting a legacy (pre-Argon2 / vault-migrated)
    // key at unlock. upsertOne overwrites the existing entity's encryptedSecretKey
    // in place rather than adding a new one — the key already exists, only its
    // ciphertext (and the shared top-level salt) changed.
    softwareKeyReEncrypted(state, action: PayloadAction<{ salt: string; key: SoftwareKeyConfig }>) {
      keyAdapter.upsertOne(state, action.payload.key);
      setPasswordAuthentication(state, action.payload.salt);
    },
  },
  extraReducers: builder =>
    builder
      .addCase(fingerprintMigration, (state, action) => {
        const newFingerprint = action.payload;

        const existingKey = state.entities[assumedZeroFingerprint];
        if (existingKey) {
          keyAdapter.removeOne(state, assumedZeroFingerprint);
          keyAdapter.addOne(state, { ...existingKey, id: newFingerprint });
        }
      })
      .addCase(userRemovesWallet, (state, action) => {
        keyAdapter.removeOne(state, action.payload.fingerprint);
        if (state.ids.length === 0) clearAuthentication(state);
      })
      .addCase(resetWallet, state => {
        clearAuthentication(state);
        return keyAdapter.removeAll(state);
      }),
});
