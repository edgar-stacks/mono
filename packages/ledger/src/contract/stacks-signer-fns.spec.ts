import {
  type StacksTransactionWire,
  makeUnsignedSTXTokenTransfer,
  stringAsciiCV,
} from '@stacks/transactions';

import { makeFakeHardwareStacksSigner } from './hardware-wallet.test-utils';
import { createStacksSignerFnsFromHardwareWallet } from './stacks-signer-fns';

const publicKey = '02b6b0afe5f620bc8e532b640b148dd9dea0ed19d11f8ab420fcce488fe3974893';
const derivationPath = "m/44'/5757'/0'/0/0";
const signatureData = { signature: 'abcd', publicKey };

async function makeTransaction(): Promise<StacksTransactionWire> {
  return makeUnsignedSTXTokenTransfer({
    recipient: 'SPXH3HNBPM5YP15VH16ZXZ9AX6CK289K3MCXRKCB',
    amount: 500,
    fee: 100,
    nonce: 0,
    network: 'mainnet',
    publicKey,
  });
}

describe(createStacksSignerFnsFromHardwareWallet.name, () => {
  test('signs transactions with the account derivation path', async () => {
    const transaction = await makeTransaction();
    const signer = makeFakeHardwareStacksSigner({
      signTransaction: vi.fn().mockResolvedValue(transaction),
    });
    const ctx = { onInteraction: vi.fn() };

    const { signFn } = createStacksSignerFnsFromHardwareWallet(
      signer,
      { derivationPath, publicKey },
      ctx
    );

    await expect(signFn(transaction)).resolves.toBe(transaction);
    expect(signer.signTransaction).toHaveBeenCalledWith({ transaction, derivationPath }, ctx);
  });

  test('signs messages with the account key', async () => {
    const signer = makeFakeHardwareStacksSigner({
      signMessage: vi.fn().mockResolvedValue(signatureData),
    });

    const { signMessageFn } = createStacksSignerFnsFromHardwareWallet(
      signer,
      { derivationPath, publicKey },
      {}
    );

    await expect(signMessageFn('hello')).resolves.toBe(signatureData);
    expect(signer.signMessage).toHaveBeenCalledWith(
      { message: 'hello', derivationPath, publicKey },
      {}
    );
  });

  test('signs structured messages with the account key', async () => {
    const signer = makeFakeHardwareStacksSigner({
      signStructuredMessage: vi.fn().mockResolvedValue(signatureData),
    });
    const message = stringAsciiCV('message');
    const domain = stringAsciiCV('domain');

    const { signStructuredMessageFn } = createStacksSignerFnsFromHardwareWallet(
      signer,
      { derivationPath, publicKey },
      {}
    );

    await expect(signStructuredMessageFn(message, domain)).resolves.toBe(signatureData);
    expect(signer.signStructuredMessage).toHaveBeenCalledWith(
      { message, domain, derivationPath, publicKey },
      {}
    );
  });
});
