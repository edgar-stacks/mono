import { HDKey } from '@scure/bip32';
import { Cl, isSingleSig, makeUnsignedSTXTokenTransfer, serializeCV } from '@stacks/transactions';
import { LedgerError } from '@zondax/ledger-stacks';

import { makeFakeOperationContext } from '../contract/hardware-wallet.test-utils';
import { makeFakeLedgerStacksApp } from '../ledger-app.test-utils';
import { createLedgerStacksSigner } from './ledger-stacks-signer';

const derivationPath = "m/44'/5757'/0'/0/0";
const identityDerivationPath = "m/888'/0'/0'";
const publicKey = Buffer.from(
  HDKey.fromMasterSeed(new Uint8Array(32).fill(1)).derive(derivationPath).publicKey ?? []
);
const signatureVRS = Buffer.alloc(65, 1);
const noErrorsReturnCode: number = LedgerError.NoErrors;

function makeResponse(returnCode = noErrorsReturnCode) {
  return {
    returnCode,
    errorMessage: returnCode === noErrorsReturnCode ? 'No errors' : 'Device error',
  };
}

function makeSignResponse(returnCode?: number) {
  return { ...makeResponse(returnCode), signatureVRS, postSignHash: Buffer.alloc(0) };
}

function makeAddressResponse(returnCode?: number) {
  return { ...makeResponse(returnCode), publicKey, address: 'SP-device' };
}

function makeSigner(app: Parameters<typeof makeFakeLedgerStacksApp>[0] = {}) {
  return createLedgerStacksSigner(
    makeFakeLedgerStacksApp({
      getMasterFingerprint: vi
        .fn()
        .mockResolvedValue({ ...makeResponse(), fingerprint: Buffer.from('deadbeef', 'hex') }),
      ...app,
    })
  );
}

function makeTransaction() {
  return makeUnsignedSTXTokenTransfer({
    recipient: 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159',
    amount: 1n,
    fee: 1n,
    nonce: 0n,
    network: 'mainnet',
    publicKey: publicKey.toString('hex'),
  });
}

describe('getMasterFingerprint', () => {
  test('returns the device fingerprint as hex', async () => {
    await expect(makeSigner().getMasterFingerprint(makeFakeOperationContext())).resolves.toBe(
      'deadbeef'
    );
  });
});

describe('requestAccountKeys', () => {
  test('requests the stx and identity keys of each account', async () => {
    const getAddressAndPubKey = vi.fn().mockResolvedValue(makeAddressResponse());
    const getIdentityPubKey = vi.fn().mockResolvedValue(makeAddressResponse());
    const onRequestKey = vi.fn();
    const signer = makeSigner({ getAddressAndPubKey, getIdentityPubKey });

    const result = await signer.requestAccountKeys(
      {
        accounts: [
          { derivationPath, identityDerivationPath },
          { derivationPath: "m/44'/5757'/0'/0/1" },
        ],
        onRequestKey,
      },
      makeFakeOperationContext()
    );

    expect(result.fingerprint).toBe('deadbeef');
    expect(result.keys[0]).toMatchObject({
      derivationPath,
      stxPublicKey: publicKey.toString('hex'),
    });
    expect(result.keys[0]?.dataPublicKey).toHaveLength(130);
    expect(result.keys[1]?.dataPublicKey).toBeNull();
    expect(getIdentityPubKey).toHaveBeenCalledOnce();
    expect(getIdentityPubKey).toHaveBeenCalledWith(identityDerivationPath);
    expect(onRequestKey.mock.calls).toEqual([[0], [1]]);
  });

  test('maps a missing key into a hardware wallet error with the device message', async () => {
    const signer = makeSigner({
      getAddressAndPubKey: vi.fn().mockResolvedValue({
        returnCode: 0x6f00,
        errorMessage: 'Unknown error',
      }),
    });

    await expect(
      signer.requestAccountKeys({ accounts: [{ derivationPath }] }, makeFakeOperationContext())
    ).rejects.toMatchObject({ kind: 'unknown', message: 'Unknown error' });
  });
});

describe('signTransaction', () => {
  test('signs the serialized transaction and reports the device prompt', async () => {
    const sign = vi.fn().mockResolvedValue(makeSignResponse());
    const onInteraction = vi.fn();
    const transaction = await makeTransaction();

    const signed = await makeSigner({ sign }).signTransaction(
      { transaction, derivationPath },
      makeFakeOperationContext({ onInteraction })
    );

    expect(sign).toHaveBeenCalledWith(derivationPath, Buffer.from(transaction.serialize(), 'hex'));
    expect(onInteraction).toHaveBeenCalledWith({ type: 'confirm-on-device' });
    if (!isSingleSig(signed.auth.spendingCondition)) throw new Error('Expected single sig');
    expect(signed.auth.spendingCondition.signature.data).toBe(signatureVRS.toString('hex'));
  });

  test.each([
    [LedgerError.TransactionRejected, 'rejected'],
    [LedgerError.DataIsInvalid, 'invalid-payload'],
    [0x6f00, 'unknown'],
  ])('maps the %s device response', async (returnCode, kind) => {
    const sign = vi.fn().mockResolvedValue(makeSignResponse(returnCode));

    await expect(
      makeSigner({ sign }).signTransaction(
        { transaction: await makeTransaction(), derivationPath },
        makeFakeOperationContext()
      )
    ).rejects.toMatchObject({ kind });
  });
});

describe('signMessage', () => {
  test('signs a utf8 message and returns an rsv signature with the account key', async () => {
    const sign_msg = vi.fn().mockResolvedValue(makeSignResponse());

    const result = await makeSigner({ sign_msg }).signMessage(
      { message: 'hello', derivationPath, publicKey: '02abc' },
      makeFakeOperationContext()
    );

    expect(sign_msg).toHaveBeenCalledWith(derivationPath, 'hello');
    expect(result).toEqual({
      signature: `${'01'.repeat(64)}01`,
      publicKey: '02abc',
    });
  });
});

describe('signStructuredMessage', () => {
  test('signs the serialized domain and message', async () => {
    const sign_structured_msg = vi.fn().mockResolvedValue(makeSignResponse());
    const message = Cl.stringAscii('hello');
    const domain = Cl.tuple({ name: Cl.stringAscii('app') });

    await makeSigner({ sign_structured_msg }).signStructuredMessage(
      { message, domain, derivationPath, publicKey: '02abc' },
      makeFakeOperationContext()
    );

    expect(sign_structured_msg).toHaveBeenCalledWith(
      derivationPath,
      serializeCV(domain),
      serializeCV(message)
    );
  });

  test('maps a rejection on the device', async () => {
    const sign_structured_msg = vi
      .fn()
      .mockResolvedValue(makeSignResponse(LedgerError.TransactionRejected));

    await expect(
      makeSigner({ sign_structured_msg }).signStructuredMessage(
        {
          message: Cl.stringAscii('hello'),
          domain: Cl.tuple({}),
          derivationPath,
          publicKey: '02abc',
        },
        makeFakeOperationContext()
      )
    ).rejects.toMatchObject({ kind: 'rejected' });
  });
});

describe('showAddress', () => {
  test('shows the address for the network and reports the verify prompt', async () => {
    const showAddressAndPubKey = vi.fn().mockResolvedValue(makeAddressResponse());
    const onInteraction = vi.fn();

    await expect(
      makeSigner({ showAddressAndPubKey }).showAddress(
        { derivationPath, network: 'testnet' },
        makeFakeOperationContext({ onInteraction })
      )
    ).resolves.toBe('SP-device');
    expect(showAddressAndPubKey).toHaveBeenCalledWith(derivationPath, 26);
    expect(onInteraction).toHaveBeenCalledWith({ type: 'verify-address' });
  });

  test('maps a rejection with the verification message', async () => {
    const showAddressAndPubKey = vi
      .fn()
      .mockResolvedValue(makeAddressResponse(LedgerError.TransactionRejected));

    await expect(
      makeSigner({ showAddressAndPubKey }).showAddress(
        { derivationPath, network: 'mainnet' },
        makeFakeOperationContext()
      )
    ).rejects.toMatchObject({
      kind: 'rejected',
      message: 'Address verification was rejected on the device.',
    });
  });
});
