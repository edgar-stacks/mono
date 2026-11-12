import { ChainId } from '@stacks/network';
import {
  AddressHashMode,
  AddressVersion,
  deserializeTransaction,
  isSingleSig,
  makeUnsignedSTXTokenTransfer,
} from '@stacks/transactions';
import { LedgerError } from '@zondax/ledger-stacks';

import {
  isLedgerDeviceDisconnectedError,
  isLedgerDeviceLockedError,
} from '../dmk/ledger-dmk-errors';
import { makeFakeLedgerStacksApp } from './ledger-app.mocks';
import {
  MINIMUM_STACKS_APP_VERSION,
  getStacksAppVersion,
  isStxAddressResponseRejected,
  isStxAddressResponseSuccess,
  makeStxMultisigAddressOptions,
  showStxAddressOnDevice,
  showStxMultisigAddressOnDevice,
  signStacksTransactionWithSignature,
  stacksChainIdToMultiSigAddressVersion,
  stacksChainIdToSingleSigAddressVersion,
  validateStacksAppVersion,
} from './stacks-ledger-utils';

const recipient = 'SPXH3HNBPM5YP15VH16ZXZ9AX6CK289K3MCXRKCB';
const signerPublicKey = '02b6b0afe5f620bc8e532b640b148dd9dea0ed19d11f8ab420fcce488fe3974893';
const secondPublicKey = '03c1e856462ca2844adb898aee90af5237e9d1be0fe51212635b2f7a643b0585e1';
const signatureHex = '00'.repeat(65);
const signatureVrs = Buffer.from(signatureHex, 'hex');

describe(signStacksTransactionWithSignature.name, () => {
  test('sets the signature on single-sig transactions', async () => {
    const unsignedTx = await makeUnsignedSTXTokenTransfer({
      recipient,
      amount: 500,
      fee: 100,
      nonce: 0,
      network: 'mainnet',
      publicKey: signerPublicKey,
    });

    const signedTx = signStacksTransactionWithSignature(unsignedTx.serialize(), signatureVrs);
    const spendingCondition = signedTx.auth.spendingCondition;

    if (!isSingleSig(spendingCondition)) throw new Error('Expected single-sig spending condition');

    expect(spendingCondition.signature.data).toEqual(signatureHex);
    expect(() => signedTx.serialize()).not.toThrow();
  });

  test('appends a signature auth field to multisig transactions', async () => {
    const unsignedTx = await makeUnsignedSTXTokenTransfer({
      recipient,
      amount: 500,
      fee: 100,
      nonce: 0,
      network: 'mainnet',
      publicKeys: [secondPublicKey, signerPublicKey],
      numSignatures: 2,
    });

    const signedTx = signStacksTransactionWithSignature(unsignedTx.serialize(), signatureVrs);
    const spendingCondition = signedTx.auth.spendingCondition;

    if (isSingleSig(spendingCondition)) throw new Error('Expected multisig spending condition');

    expect(spendingCondition.fields).toHaveLength(1);
    expect(() => signedTx.serialize()).not.toThrow();

    const serializedTx = signedTx.serialize();
    const deserializedTx = deserializeTransaction(serializedTx);
    const deserializedSpendingCondition = deserializedTx.auth.spendingCondition;

    if (isSingleSig(deserializedSpendingCondition))
      throw new Error('Expected deserialized multisig spending condition');

    expect(deserializedSpendingCondition.fields).toHaveLength(1);
  });
});

function makeAddressResponse(returnCode: number) {
  return {
    returnCode,
    errorMessage: '',
    publicKey: Buffer.alloc(33),
    address: 'SPXH3HNBPM5YP15VH16ZXZ9AX6CK289K3MCXRKCB',
  };
}

describe(getStacksAppVersion.name, () => {
  function makeVersionResponse(returnCode: number, errorMessage: string) {
    return {
      returnCode,
      errorMessage,
      testMode: false,
      major: 0,
      minor: 26,
      patch: 19,
      deviceLocked: false,
      targetId: '',
    };
  }

  test('returns the version tagged with the app name and chain', async () => {
    const app = makeFakeLedgerStacksApp({
      getVersion: vi.fn().mockResolvedValue(makeVersionResponse(LedgerError.NoErrors, 'No errors')),
    });

    await expect(getStacksAppVersion(app)).resolves.toMatchObject({
      name: 'Stacks',
      chain: 'stacks',
      major: 0,
      minor: 26,
      patch: 19,
    });
  });

  test('keeps the disconnect cause when the transport fails during the version check', async () => {
    const response = Object.assign(makeVersionResponse(0xffff, 'Unknown transport error'), {
      cause: { _tag: 'DeviceDisconnectedWhileSendingError' },
    });
    const app = makeFakeLedgerStacksApp({ getVersion: vi.fn().mockResolvedValue(response) });

    await expect(getStacksAppVersion(app)).rejects.toSatisfy(isLedgerDeviceDisconnectedError);
  });

  test('keeps the status code when the device is locked during the version check', async () => {
    const app = makeFakeLedgerStacksApp({
      getVersion: vi.fn().mockResolvedValue(makeVersionResponse(0x5515, 'Unknown Status Code')),
    });

    await expect(getStacksAppVersion(app)).rejects.toSatisfy(isLedgerDeviceLockedError);
  });
});

describe(stacksChainIdToSingleSigAddressVersion.name, () => {
  test('maps the mainnet chain id to the mainnet single sig version', () => {
    expect(stacksChainIdToSingleSigAddressVersion(ChainId.Mainnet)).toBe(
      AddressVersion.MainnetSingleSig
    );
  });

  test('maps the testnet chain id to the testnet single sig version', () => {
    expect(stacksChainIdToSingleSigAddressVersion(ChainId.Testnet)).toBe(
      AddressVersion.TestnetSingleSig
    );
  });

  test('falls back to the testnet version for custom chain ids', () => {
    expect(stacksChainIdToSingleSigAddressVersion(256)).toBe(AddressVersion.TestnetSingleSig);
  });
});

describe(stacksChainIdToMultiSigAddressVersion.name, () => {
  test('maps the mainnet chain id to the mainnet multisig version', () => {
    expect(stacksChainIdToMultiSigAddressVersion(ChainId.Mainnet)).toBe(
      AddressVersion.MainnetMultiSig
    );
  });

  test('maps the testnet chain id to the testnet multisig version', () => {
    expect(stacksChainIdToMultiSigAddressVersion(ChainId.Testnet)).toBe(
      AddressVersion.TestnetMultiSig
    );
  });

  test('falls back to the testnet multisig version for custom chain ids', () => {
    expect(stacksChainIdToMultiSigAddressVersion(256)).toBe(AddressVersion.TestnetMultiSig);
  });
});

describe(makeStxMultisigAddressOptions.name, () => {
  const thirdPublicKey = '02d4b2a7fb1d1e6a5e0b6f3d5c1d9a1f4f6e3b2c1a0f9e8d7c6b5a4f3e2d1c0b9a';

  test('places the device key first and passes the other keys as cosigners', () => {
    expect(
      makeStxMultisigAddressOptions({
        publicKeys: [signerPublicKey, secondPublicKey, thirdPublicKey],
        threshold: 2,
        devicePublicKey: signerPublicKey,
      })
    ).toEqual({
      status: 'ok',
      options: {
        numRequired: 2,
        deviceKeyIndex: 0,
        cosignerPublicKeys: [secondPublicKey, thirdPublicKey],
        hashMode: AddressHashMode.P2SHNonSequential,
      },
    });
  });

  test('keeps the order of the other keys when the device key is in the middle', () => {
    expect(
      makeStxMultisigAddressOptions({
        publicKeys: [secondPublicKey, signerPublicKey, thirdPublicKey],
        threshold: 2,
        devicePublicKey: signerPublicKey,
      })
    ).toMatchObject({
      status: 'ok',
      options: { deviceKeyIndex: 1, cosignerPublicKeys: [secondPublicKey, thirdPublicKey] },
    });
  });

  test('gives the last index when the device key is last', () => {
    expect(
      makeStxMultisigAddressOptions({
        publicKeys: [secondPublicKey, thirdPublicKey, signerPublicKey],
        threshold: 3,
        devicePublicKey: signerPublicKey,
      })
    ).toMatchObject({
      status: 'ok',
      options: {
        numRequired: 3,
        deviceKeyIndex: 2,
        cosignerPublicKeys: [secondPublicKey, thirdPublicKey],
      },
    });
  });

  test('matches the device key case-insensitively and lowercases the cosigner keys', () => {
    expect(
      makeStxMultisigAddressOptions({
        publicKeys: [secondPublicKey.toUpperCase(), signerPublicKey.toUpperCase()],
        threshold: 2,
        devicePublicKey: signerPublicKey,
      })
    ).toMatchObject({
      status: 'ok',
      options: { deviceKeyIndex: 1, cosignerPublicKeys: [secondPublicKey] },
    });
  });

  test('fails when the device key is not one of the multisig keys', () => {
    expect(
      makeStxMultisigAddressOptions({
        publicKeys: [secondPublicKey, thirdPublicKey],
        threshold: 2,
        devicePublicKey: signerPublicKey,
      })
    ).toEqual({
      status: 'error',
      message: 'The active account is not a signer of this multisig.',
    });
  });

  test('fails for multisigs with more keys than the Ledger supports', () => {
    const publicKeys = [signerPublicKey, ...Array.from({ length: 15 }, () => secondPublicKey)];

    expect(
      makeStxMultisigAddressOptions({ publicKeys, threshold: 2, devicePublicKey: signerPublicKey })
    ).toEqual({
      status: 'error',
      message: 'Ledger can only verify multisig addresses with up to 15 keys.',
    });
  });
});

describe(isStxAddressResponseRejected.name, () => {
  test('detects an on-device rejection', () => {
    expect(isStxAddressResponseRejected(makeAddressResponse(LedgerError.TransactionRejected))).toBe(
      true
    );
  });

  test('does not flag a successful response', () => {
    expect(isStxAddressResponseRejected(makeAddressResponse(LedgerError.NoErrors))).toBe(false);
  });
});

describe(isStxAddressResponseSuccess.name, () => {
  test('accepts a successful response', () => {
    expect(isStxAddressResponseSuccess(makeAddressResponse(LedgerError.NoErrors))).toBe(true);
  });

  test('rejects any error return code', () => {
    expect(isStxAddressResponseSuccess(makeAddressResponse(LedgerError.TransactionRejected))).toBe(
      false
    );
  });
});

describe(showStxAddressOnDevice.name, () => {
  test('shows the account derivation path with the given address version', async () => {
    const showAddressAndPubKey = vi.fn(() =>
      Promise.resolve(makeAddressResponse(LedgerError.NoErrors))
    );
    const app = makeFakeLedgerStacksApp({ showAddressAndPubKey });

    await showStxAddressOnDevice(app)("m/44'/5757'/0'/0/3", AddressVersion.MainnetSingleSig);

    expect(showAddressAndPubKey).toHaveBeenCalledWith(
      "m/44'/5757'/0'/0/3",
      AddressVersion.MainnetSingleSig
    );
  });

  test('shows a ledger live derivation path unchanged', async () => {
    const showAddressAndPubKey = vi.fn(() =>
      Promise.resolve(makeAddressResponse(LedgerError.NoErrors))
    );
    const app = makeFakeLedgerStacksApp({ showAddressAndPubKey });

    await showStxAddressOnDevice(app)("m/44'/5757'/3'/0/0", AddressVersion.MainnetSingleSig);

    expect(showAddressAndPubKey).toHaveBeenCalledWith(
      "m/44'/5757'/3'/0/0",
      AddressVersion.MainnetSingleSig
    );
  });
});

describe(showStxMultisigAddressOnDevice.name, () => {
  test('passes the derivation path, address version and multisig options through', async () => {
    const showMultisigAddressAndPubKey = vi.fn(() =>
      Promise.resolve(makeAddressResponse(LedgerError.NoErrors))
    );
    const app = makeFakeLedgerStacksApp({ showMultisigAddressAndPubKey });
    const options = {
      numRequired: 2,
      deviceKeyIndex: 1,
      cosignerPublicKeys: [secondPublicKey],
      hashMode: AddressHashMode.P2SHNonSequential,
    };

    await showStxMultisigAddressOnDevice(app)(
      "m/44'/5757'/0'/0/0",
      AddressVersion.MainnetMultiSig,
      options
    );

    expect(showMultisigAddressAndPubKey).toHaveBeenCalledWith(
      "m/44'/5757'/0'/0/0",
      AddressVersion.MainnetMultiSig,
      options
    );
  });
});

describe(validateStacksAppVersion.name, () => {
  test('rejects versions below the minimum', () => {
    expect(validateStacksAppVersion({ major: 0, minor: 26, patch: 18 })).toEqual({
      meetsMinimum: false,
      currentVersion: '0.26.18',
    });
    expect(validateStacksAppVersion({ major: 0, minor: 25, patch: 99 }).meetsMinimum).toBe(false);
  });

  test('accepts the exact minimum version', () => {
    expect(validateStacksAppVersion({ major: 0, minor: 26, patch: 19 })).toEqual({
      meetsMinimum: true,
      currentVersion: MINIMUM_STACKS_APP_VERSION,
    });
  });

  test('accepts versions above the minimum', () => {
    expect(validateStacksAppVersion({ major: 0, minor: 26, patch: 20 }).meetsMinimum).toBe(true);
    expect(validateStacksAppVersion({ major: 0, minor: 27, patch: 0 }).meetsMinimum).toBe(true);
    expect(validateStacksAppVersion({ major: 1, minor: 0, patch: 0 }).meetsMinimum).toBe(true);
  });
});
