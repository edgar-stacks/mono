import { ChainId } from '@stacks/network';
import {
  AddressVersion,
  isSingleSig,
  makeUnsignedSTXTokenTransfer,
  serializeCV,
  serializeTransaction,
  stringAsciiCV,
} from '@stacks/transactions';
import { LedgerError } from '@zondax/ledger-stacks';

import { makeFakeLedgerStacksApp } from '../ledger-app.test-utils';
import { createLedgerStacksSigner } from './ledger-stacks-signer';

const signerPublicKey = '02b6b0afe5f620bc8e532b640b148dd9dea0ed19d11f8ab420fcce488fe3974893';
const derivationPath = "m/44'/5757'/0'/0/0";
const signatureVRS = Buffer.from('01'.repeat(65), 'hex');

function ok<Response extends object>(response: Response) {
  return { returnCode: LedgerError.NoErrors, errorMessage: 'No errors', ...response };
}

function failed(returnCode: number, errorMessage: string) {
  return { returnCode, errorMessage };
}

function makeTransaction() {
  return makeUnsignedSTXTokenTransfer({
    recipient: 'SPXH3HNBPM5YP15VH16ZXZ9AX6CK289K3MCXRKCB',
    amount: 500,
    fee: 100,
    nonce: 0,
    network: 'mainnet',
    publicKey: signerPublicKey,
  });
}

describe(createLedgerStacksSigner.name, () => {
  test('returns the device fingerprint as hex', async () => {
    const app = makeFakeLedgerStacksApp({
      getMasterFingerprint: vi
        .fn()
        .mockResolvedValue(ok({ fingerprint: Buffer.from('deadbeef', 'hex') })),
    });

    await expect(createLedgerStacksSigner(app).getMasterFingerprint({})).resolves.toBe('deadbeef');
  });

  test('returns the public key at a derivation path', async () => {
    const getAddressAndPubKey = vi
      .fn()
      .mockResolvedValue(ok({ publicKey: Buffer.from(signerPublicKey, 'hex'), address: 'SP1' }));
    const app = makeFakeLedgerStacksApp({ getAddressAndPubKey });

    await expect(createLedgerStacksSigner(app).getPublicKey({ derivationPath }, {})).resolves.toBe(
      signerPublicKey
    );
    expect(getAddressAndPubKey).toHaveBeenCalledWith(
      derivationPath,
      AddressVersion.MainnetSingleSig
    );
  });

  test('requests the account and identity keys for each account', async () => {
    const identityPublicKey = Buffer.from(signerPublicKey, 'hex');
    const getAddressAndPubKey = vi
      .fn()
      .mockResolvedValue(ok({ publicKey: Buffer.from(signerPublicKey, 'hex'), address: 'SP1' }));
    const getIdentityPubKey = vi
      .fn()
      .mockResolvedValue(ok({ publicKey: identityPublicKey, address: 'SP1' }));
    const onRequestKey = vi.fn();
    const app = makeFakeLedgerStacksApp({
      getMasterFingerprint: vi
        .fn()
        .mockResolvedValue(ok({ fingerprint: Buffer.from('deadbeef', 'hex') })),
      getAddressAndPubKey,
      getIdentityPubKey,
    });

    const result = await createLedgerStacksSigner(app).requestAccountKeys(
      { derivationPathType: 'bip44', count: 2, onRequestKey },
      {}
    );

    expect(result.fingerprint).toBe('deadbeef');
    expect(result.keys.map(({ path }) => path)).toEqual([
      "m/44'/5757'/0'/0/0",
      "m/44'/5757'/1'/0/0",
    ]);
    expect(result.keys[0].stxPublicKey).toBe(signerPublicKey);
    expect(result.keys[0].dataPublicKey).toHaveLength(130);
    expect(getIdentityPubKey.mock.calls).toEqual([["m/888'/0'/0'"], ["m/888'/0'/1'"]]);
    expect(onRequestKey.mock.calls).toEqual([[0], [1]]);
  });

  test('keeps the device message when a key request fails', async () => {
    const app = makeFakeLedgerStacksApp({
      getMasterFingerprint: vi
        .fn()
        .mockResolvedValue(ok({ fingerprint: Buffer.from('deadbeef', 'hex') })),
      getAddressAndPubKey: vi.fn().mockResolvedValue(failed(0x6f00, 'App does not seem open')),
    });

    await expect(
      createLedgerStacksSigner(app).requestAccountKeys(
        { derivationPathType: 'stacks', count: 1 },
        {}
      )
    ).rejects.toMatchObject({ kind: 'unknown', message: 'App does not seem open' });
  });

  test('signs a transaction and applies the device signature', async () => {
    const transaction = await makeTransaction();
    const unsignedTx = serializeTransaction(transaction);
    const sign = vi.fn().mockResolvedValue(ok({ signatureVRS }));
    const onInteraction = vi.fn();

    const signed = await createLedgerStacksSigner(
      makeFakeLedgerStacksApp({ sign })
    ).signTransaction({ transaction, derivationPath }, { onInteraction });

    expect(sign).toHaveBeenCalledWith(derivationPath, Buffer.from(unsignedTx, 'hex'));
    const spendingCondition = signed.auth.spendingCondition;
    if (!isSingleSig(spendingCondition)) throw new Error('Expected a single-sig transaction');
    expect(spendingCondition.signature.data).toBe(signatureVRS.toString('hex'));
    expect(onInteraction).toHaveBeenCalledWith({ type: 'confirm-on-device' });
  });

  test.each([
    [LedgerError.TransactionRejected, 'rejected'],
    [LedgerError.DataIsInvalid, 'invalid-payload'],
    [0x6f00, 'unknown'],
  ])('maps a %s transaction signing response to the %s kind', async (returnCode, kind) => {
    const transaction = await makeTransaction();
    const app = makeFakeLedgerStacksApp({
      sign: vi.fn().mockResolvedValue(failed(returnCode, 'Device error')),
    });

    await expect(
      createLedgerStacksSigner(app).signTransaction({ transaction, derivationPath }, {})
    ).rejects.toMatchObject({ kind, message: 'Device error' });
  });

  test('signs a utf8 message and returns an RSV signature with the account key', async () => {
    const sign_msg = vi.fn().mockResolvedValue(ok({ signatureVRS }));

    const result = await createLedgerStacksSigner(
      makeFakeLedgerStacksApp({ sign_msg })
    ).signMessage({ message: 'hello', derivationPath, publicKey: signerPublicKey }, {});

    expect(sign_msg).toHaveBeenCalledWith(derivationPath, 'hello');
    expect(result).toEqual({
      signature: '01'.repeat(64) + '01',
      publicKey: signerPublicKey,
    });
  });

  test('signs a structured message with the serialised domain and message', async () => {
    const sign_structured_msg = vi.fn().mockResolvedValue(ok({ signatureVRS }));
    const domain = stringAsciiCV('domain');
    const message = stringAsciiCV('message');

    await createLedgerStacksSigner(
      makeFakeLedgerStacksApp({ sign_structured_msg })
    ).signStructuredMessage({ domain, message, derivationPath, publicKey: signerPublicKey }, {});

    expect(sign_structured_msg).toHaveBeenCalledWith(
      derivationPath,
      serializeCV(domain),
      serializeCV(message)
    );
  });

  test('shows the address on the device for the network', async () => {
    const showAddressAndPubKey = vi
      .fn()
      .mockResolvedValue(ok({ address: 'ST1', publicKey: Buffer.alloc(33) }));

    await expect(
      createLedgerStacksSigner(makeFakeLedgerStacksApp({ showAddressAndPubKey })).showAddress(
        { derivationPath, chainId: ChainId.Testnet },
        {}
      )
    ).resolves.toBe('ST1');
    expect(showAddressAndPubKey).toHaveBeenCalledWith(
      derivationPath,
      AddressVersion.TestnetSingleSig
    );
  });

  test('maps a rejected address check to a rejected error', async () => {
    const app = makeFakeLedgerStacksApp({
      showAddressAndPubKey: vi
        .fn()
        .mockResolvedValue(failed(LedgerError.TransactionRejected, 'Rejected')),
    });

    await expect(
      createLedgerStacksSigner(app).showAddress({ derivationPath, chainId: ChainId.Mainnet }, {})
    ).rejects.toMatchObject({ kind: 'rejected' });
  });

  test('does not talk to the device once the signal has aborted', async () => {
    const getMasterFingerprint = vi.fn();
    const controller = new AbortController();
    controller.abort();

    await expect(
      createLedgerStacksSigner(
        makeFakeLedgerStacksApp({ getMasterFingerprint })
      ).getMasterFingerprint({ signal: controller.signal })
    ).rejects.toMatchObject({ kind: 'cancelled' });
    expect(getMasterFingerprint).not.toHaveBeenCalled();
  });
});
