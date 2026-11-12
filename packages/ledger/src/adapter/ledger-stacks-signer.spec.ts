import { ChainId } from '@stacks/network';
import {
  AddressVersion,
  Cl,
  isSingleSig,
  makeUnsignedSTXTokenTransfer,
  serializeCV,
} from '@stacks/transactions';
import { LedgerError } from '@zondax/ledger-stacks';

import { makeFakeOperationContext } from '../contract/hardware-wallet.test-utils';
import { makeFakeLedgerStacksApp } from '../ledger-app.test-utils';
import { createLedgerStacksSigner } from './ledger-stacks-signer';

const publicKey = '02b6b0afe5f620bc8e532b640b148dd9dea0ed19d11f8ab420fcce488fe3974893';
const uncompressedPublicKey =
  '04b6b0afe5f620bc8e532b640b148dd9dea0ed19d11f8ab420fcce488fe397489313059d82114b9799c3cc40dc1fee10dcaa04ef553b2ad7a66d6cff253da28804';
const derivationPath = "m/44'/5757'/0'/0/0";
const signatureVrs = Buffer.from(`01${'ab'.repeat(64)}`, 'hex');
const ctx = makeFakeOperationContext();

function makeSignResponse(returnCode: number, errorMessage = 'No errors') {
  return {
    returnCode,
    errorMessage,
    postSignHash: Buffer.alloc(32),
    signatureCompact: Buffer.alloc(65),
    signatureVRS: signatureVrs,
    signatureDER: Buffer.alloc(72),
  };
}

function makeAddressResponse(
  returnCode: number,
  { publicKeyHex = publicKey, errorMessage = 'No errors', address = 'SP123' } = {}
) {
  return {
    returnCode,
    errorMessage,
    publicKey: Buffer.from(publicKeyHex, 'hex'),
    address,
  };
}

function makeUnsignedTransfer() {
  return makeUnsignedSTXTokenTransfer({
    recipient: 'SPXH3HNBPM5YP15VH16ZXZ9AX6CK289K3MCXRKCB',
    amount: 500,
    fee: 100,
    nonce: 0,
    network: 'mainnet',
    publicKey,
  });
}

describe(createLedgerStacksSigner.name, () => {
  test('reads the master fingerprint from the device as hex', async () => {
    const getMasterFingerprint = vi.fn().mockResolvedValue({
      returnCode: LedgerError.NoErrors,
      errorMessage: 'No errors',
      fingerprint: Buffer.from('e87a850b', 'hex'),
    });
    const signer = createLedgerStacksSigner(makeFakeLedgerStacksApp({ getMasterFingerprint }));

    await expect(signer.getMasterFingerprint(ctx)).resolves.toBe('e87a850b');
  });

  describe('requestAccountKeys', () => {
    test('requests the stx and identity key of each account', async () => {
      const getAddressAndPubKey = vi
        .fn()
        .mockResolvedValue(makeAddressResponse(LedgerError.NoErrors));
      const getIdentityPubKey = vi
        .fn()
        .mockResolvedValue(makeAddressResponse(LedgerError.NoErrors));
      const getMasterFingerprint = vi
        .fn()
        .mockResolvedValue({ fingerprint: Buffer.from('e87a850b', 'hex') });
      const onRequestKey = vi.fn();
      const signer = createLedgerStacksSigner(
        makeFakeLedgerStacksApp({ getAddressAndPubKey, getIdentityPubKey, getMasterFingerprint })
      );

      const result = await signer.requestAccountKeys(
        { derivationPathType: 'bip44', accountIndexes: [0, 1], onRequestKey },
        ctx
      );

      expect(result).toEqual({
        fingerprint: 'e87a850b',
        keys: [
          {
            path: "m/44'/5757'/0'/0/0",
            stxPublicKey: publicKey,
            dataPublicKey: uncompressedPublicKey,
          },
          {
            path: "m/44'/5757'/1'/0/0",
            stxPublicKey: publicKey,
            dataPublicKey: uncompressedPublicKey,
          },
        ],
      });
      expect(onRequestKey.mock.calls).toEqual([[0], [1]]);
      expect(getAddressAndPubKey).toHaveBeenCalledWith(
        "m/44'/5757'/1'/0/0",
        AddressVersion.MainnetSingleSig
      );
      expect(getIdentityPubKey).toHaveBeenCalledWith("m/888'/0'/1'");
    });

    test('uses the stacks derivation path type', async () => {
      const getAddressAndPubKey = vi
        .fn()
        .mockResolvedValue(makeAddressResponse(LedgerError.NoErrors));
      const signer = createLedgerStacksSigner(
        makeFakeLedgerStacksApp({
          getAddressAndPubKey,
          getIdentityPubKey: vi.fn().mockResolvedValue(makeAddressResponse(LedgerError.NoErrors)),
          getMasterFingerprint: vi.fn().mockResolvedValue({ fingerprint: Buffer.alloc(4) }),
        })
      );

      const { keys } = await signer.requestAccountKeys(
        { derivationPathType: 'stacks', accountIndexes: [2] },
        ctx
      );

      expect(keys[0]?.path).toBe("m/44'/5757'/0'/0/2");
    });

    test('rejects with the device message when a key is missing', async () => {
      const signer = createLedgerStacksSigner(
        makeFakeLedgerStacksApp({
          getAddressAndPubKey: vi.fn().mockResolvedValue({
            returnCode: LedgerError.ExecutionError,
            errorMessage: 'Execution Error',
          }),
          getIdentityPubKey: vi.fn().mockResolvedValue(makeAddressResponse(LedgerError.NoErrors)),
          getMasterFingerprint: vi.fn().mockResolvedValue({ fingerprint: Buffer.alloc(4) }),
        })
      );

      await expect(
        signer.requestAccountKeys({ derivationPathType: 'stacks', accountIndexes: [0] }, ctx)
      ).rejects.toMatchObject({ kind: 'unknown', message: 'Execution Error' });
    });
  });

  describe('signTransaction', () => {
    test('signs the serialized transaction and applies the device signature', async () => {
      const transaction = await makeUnsignedTransfer();
      const sign = vi.fn().mockResolvedValue(makeSignResponse(LedgerError.NoErrors));
      const signer = createLedgerStacksSigner(makeFakeLedgerStacksApp({ sign }));

      const signed = await signer.signTransaction({ transaction, derivationPath }, ctx);

      expect(sign).toHaveBeenCalledWith(
        derivationPath,
        Buffer.from(transaction.serialize(), 'hex')
      );
      const { spendingCondition } = signed.auth;
      if (!isSingleSig(spendingCondition)) throw new Error('Expected single-sig');
      expect(spendingCondition.signature.data).toBe(signatureVrs.toString('hex'));
    });

    test.each([
      [LedgerError.DataIsInvalid, 'invalid-payload'],
      [LedgerError.TransactionRejected, 'rejected'],
      [LedgerError.ExecutionError, 'unknown'],
      [0x5515, 'locked'],
      [0xffff, 'disconnected'],
    ])('maps the %s return code to a %s error', async (returnCode, kind) => {
      const transaction = await makeUnsignedTransfer();
      const signer = createLedgerStacksSigner(
        makeFakeLedgerStacksApp({
          sign: vi.fn().mockResolvedValue(makeSignResponse(returnCode, 'Device error')),
        })
      );

      await expect(
        signer.signTransaction({ transaction, derivationPath }, ctx)
      ).rejects.toMatchObject({ kind });
    });

    test('keeps the device message on an invalid payload', async () => {
      const transaction = await makeUnsignedTransfer();
      const signer = createLedgerStacksSigner(
        makeFakeLedgerStacksApp({
          sign: vi
            .fn()
            .mockResolvedValue(makeSignResponse(LedgerError.DataIsInvalid, 'Data is invalid')),
        })
      );

      await expect(
        signer.signTransaction({ transaction, derivationPath }, ctx)
      ).rejects.toMatchObject({ message: 'Data is invalid' });
    });
  });

  describe('signMessage', () => {
    test('signs a utf8 message and returns an rsv signature with the key', async () => {
      const signMsg = vi.fn().mockResolvedValue(makeSignResponse(LedgerError.NoErrors));
      const signer = createLedgerStacksSigner(makeFakeLedgerStacksApp({ sign_msg: signMsg }));

      await expect(
        signer.signMessage({ message: 'hello', derivationPath, publicKey }, ctx)
      ).resolves.toEqual({ signature: `${'ab'.repeat(64)}01`, publicKey });
      expect(signMsg).toHaveBeenCalledWith(derivationPath, 'hello');
    });

    test('rejects when the message is rejected on the device', async () => {
      const signer = createLedgerStacksSigner(
        makeFakeLedgerStacksApp({
          sign_msg: vi.fn().mockResolvedValue(makeSignResponse(LedgerError.TransactionRejected)),
        })
      );

      await expect(
        signer.signMessage({ message: 'hello', derivationPath, publicKey }, ctx)
      ).rejects.toMatchObject({ kind: 'rejected' });
    });
  });

  describe('signStructuredMessage', () => {
    test('signs the serialized domain and message', async () => {
      const signStructuredMsg = vi.fn().mockResolvedValue(makeSignResponse(LedgerError.NoErrors));
      const signer = createLedgerStacksSigner(
        makeFakeLedgerStacksApp({ sign_structured_msg: signStructuredMsg })
      );
      const domain = Cl.tuple({ name: Cl.stringAscii('app') });
      const message = Cl.stringAscii('hello');

      await expect(
        signer.signStructuredMessage({ domain, message, derivationPath, publicKey }, ctx)
      ).resolves.toEqual({ signature: `${'ab'.repeat(64)}01`, publicKey });
      expect(signStructuredMsg).toHaveBeenCalledWith(
        derivationPath,
        serializeCV(domain),
        serializeCV(message)
      );
    });
  });

  describe('showAddress', () => {
    test('shows the address for the chain id and returns the device address', async () => {
      const showAddressAndPubKey = vi
        .fn()
        .mockResolvedValue(makeAddressResponse(LedgerError.NoErrors, { address: 'ST123' }));
      const signer = createLedgerStacksSigner(makeFakeLedgerStacksApp({ showAddressAndPubKey }));

      await expect(
        signer.showAddress({ derivationPath, chainId: ChainId.Testnet }, ctx)
      ).resolves.toBe('ST123');
      expect(showAddressAndPubKey).toHaveBeenCalledWith(
        derivationPath,
        AddressVersion.TestnetSingleSig
      );
    });

    test('rejects when the address is rejected on the device', async () => {
      const signer = createLedgerStacksSigner(
        makeFakeLedgerStacksApp({
          showAddressAndPubKey: vi
            .fn()
            .mockResolvedValue(makeAddressResponse(LedgerError.TransactionRejected)),
        })
      );

      await expect(
        signer.showAddress({ derivationPath, chainId: ChainId.Mainnet }, ctx)
      ).rejects.toMatchObject({ kind: 'rejected' });
    });

    test('rejects with the device message on any other error', async () => {
      const signer = createLedgerStacksSigner(
        makeFakeLedgerStacksApp({
          showAddressAndPubKey: vi
            .fn()
            .mockResolvedValue(
              makeAddressResponse(LedgerError.ExecutionError, { errorMessage: 'Execution Error' })
            ),
        })
      );

      await expect(
        signer.showAddress({ derivationPath, chainId: ChainId.Mainnet }, ctx)
      ).rejects.toMatchObject({ kind: 'unknown', message: 'Execution Error' });
    });
  });
});
