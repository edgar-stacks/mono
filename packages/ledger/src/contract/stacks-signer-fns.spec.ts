import { Cl, makeUnsignedSTXTokenTransfer } from '@stacks/transactions';

import {
  makeFakeHardwareStacksSigner,
  makeFakeOperationContext,
} from './hardware-wallet.test-utils';
import { createStacksSignerFnsFromHardwareWallet } from './stacks-signer-fns';

const key = {
  derivationPath: "m/44'/5757'/0'/0/0",
  publicKey: '025b2c58aa2be2bd4bcd77b6e5d71da3dbe3c5b1c6bf2a0b0a30b2b6b85bf4bbd5',
};

const signature = { signature: 'rsv-signature', publicKey: key.publicKey };

describe(createStacksSignerFnsFromHardwareWallet.name, () => {
  test('signs transactions with the key derivation path', async () => {
    const transaction = await makeUnsignedSTXTokenTransfer({
      recipient: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
      amount: 1n,
      fee: 1n,
      nonce: 0n,
      publicKey: key.publicKey,
    });
    const signer = makeFakeHardwareStacksSigner({
      signTransaction: vi.fn().mockResolvedValue(transaction),
    });
    const ctx = makeFakeOperationContext();

    const fns = createStacksSignerFnsFromHardwareWallet(signer, key, ctx);

    await expect(fns.sign(transaction)).resolves.toBe(transaction);
    expect(signer.signTransaction).toHaveBeenCalledWith(
      { transaction, derivationPath: key.derivationPath },
      ctx
    );
  });

  test('signs utf8 messages with the key', async () => {
    const signer = makeFakeHardwareStacksSigner({
      signMessage: vi.fn().mockResolvedValue(signature),
    });
    const ctx = makeFakeOperationContext();

    const fns = createStacksSignerFnsFromHardwareWallet(signer, key, ctx);

    await expect(fns.signMessage('hello')).resolves.toBe(signature);
    expect(signer.signMessage).toHaveBeenCalledWith({ ...key, message: 'hello' }, ctx);
  });

  test('signs structured messages with the key', async () => {
    const signer = makeFakeHardwareStacksSigner({
      signStructuredMessage: vi.fn().mockResolvedValue(signature),
    });
    const ctx = makeFakeOperationContext();
    const message = Cl.stringAscii('hello');
    const domain = Cl.tuple({ name: Cl.stringAscii('app') });

    const fns = createStacksSignerFnsFromHardwareWallet(signer, key, ctx);

    await expect(fns.signStructuredMessage(message, domain)).resolves.toBe(signature);
    expect(signer.signStructuredMessage).toHaveBeenCalledWith({ ...key, message, domain }, ctx);
  });
});
