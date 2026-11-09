import { Cl, makeUnsignedSTXTokenTransfer } from '@stacks/transactions';

import { HardwareWalletError } from './hardware-wallet-error';
import {
  makeFakeHardwareBitcoinSigner,
  makeFakeHardwareStacksSigner,
  makeFakeHardwareWallet,
  makeFakeHardwareWalletConnector,
  makeFakeHardwareWalletSession,
  makeFakeOperationContext,
} from './hardware-wallet.test-utils';
import {
  createStacksSignerFnsFromHardwareWallet,
  getBitcoinSigner,
  getStacksSigner,
  withHardwareWallet,
} from './with-hardware-wallet';

const bitcoinRequest = { chain: 'bitcoin', network: 'mainnet' } as const;

function getThrownError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

function setup() {
  const session = makeFakeHardwareWalletSession();
  const connector = makeFakeHardwareWalletConnector({
    connect: vi.fn().mockResolvedValue(session),
  });
  return { session, connector };
}

describe(withHardwareWallet.name, () => {
  test('runs the operation on the connected wallet and closes the session', async () => {
    const { session, connector } = setup();
    const ctx = makeFakeOperationContext();

    const result = await withHardwareWallet(connector, bitcoinRequest, ctx, wallet => {
      expect(wallet).toBe(session.wallet);
      return Promise.resolve('signed');
    });

    expect(result).toBe('signed');
    expect(connector.connect).toHaveBeenCalledWith(bitcoinRequest, ctx);
    expect(session.close).toHaveBeenCalledOnce();
  });

  test('closes the session when the operation fails', async () => {
    const { session, connector } = setup();
    const error = new HardwareWalletError('rejected');

    await expect(
      withHardwareWallet(connector, bitcoinRequest, makeFakeOperationContext(), () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);
    expect(session.close).toHaveBeenCalledOnce();
  });

  test('rejects as cancelled and closes the session when the operation is aborted', async () => {
    const { session, connector } = setup();
    const controller = new AbortController();

    const running = withHardwareWallet(
      connector,
      bitcoinRequest,
      makeFakeOperationContext({ signal: controller.signal }),
      () => new Promise<never>(() => undefined)
    );
    await vi.waitFor(() => expect(connector.connect).toHaveBeenCalled());
    controller.abort();

    await expect(running).rejects.toMatchObject({ kind: 'cancelled' });
    expect(session.close).toHaveBeenCalledOnce();
  });

  test('does not connect when the signal is already aborted', async () => {
    const { connector } = setup();
    const controller = new AbortController();
    controller.abort();
    const operation = vi.fn();

    await expect(
      withHardwareWallet(
        connector,
        bitcoinRequest,
        makeFakeOperationContext({ signal: controller.signal }),
        operation
      )
    ).rejects.toMatchObject({ kind: 'cancelled' });
    expect(connector.connect).not.toHaveBeenCalled();
    expect(operation).not.toHaveBeenCalled();
  });

  test('does not run the operation when connecting fails', async () => {
    const error = new HardwareWalletError('locked');
    const connector = makeFakeHardwareWalletConnector({
      connect: vi.fn().mockRejectedValue(error),
    });
    const operation = vi.fn();

    await expect(
      withHardwareWallet(connector, bitcoinRequest, makeFakeOperationContext(), operation)
    ).rejects.toBe(error);
    expect(operation).not.toHaveBeenCalled();
  });
});

describe(getBitcoinSigner.name, () => {
  test('returns the Bitcoin signer of the wallet', () => {
    const bitcoin = makeFakeHardwareBitcoinSigner();

    expect(getBitcoinSigner(makeFakeHardwareWallet({ bitcoin }))).toBe(bitcoin);
  });

  test('throws an unsupported error when the session cannot sign Bitcoin', () => {
    expect(getThrownError(() => getBitcoinSigner(makeFakeHardwareWallet()))).toMatchObject({
      kind: 'unsupported',
    });
  });
});

describe(getStacksSigner.name, () => {
  test('returns the Stacks signer of the wallet', () => {
    const stacks = makeFakeHardwareStacksSigner();

    expect(getStacksSigner(makeFakeHardwareWallet({ stacks }))).toBe(stacks);
  });

  test('throws an unsupported error when the session cannot sign Stacks', () => {
    expect(getThrownError(() => getStacksSigner(makeFakeHardwareWallet()))).toMatchObject({
      kind: 'unsupported',
    });
  });
});

describe(createStacksSignerFnsFromHardwareWallet.name, () => {
  const key = { derivationPath: "m/44'/5757'/0'/0/0", publicKey: '02abc' };
  const signature = { signature: 'sig', publicKey: key.publicKey };

  test('signs transactions with the account derivation path', async () => {
    const transaction = await makeUnsignedSTXTokenTransfer({
      recipient: 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159',
      amount: 1n,
      fee: 1n,
      nonce: 0n,
      network: 'mainnet',
      publicKey: '0362e8ea1d52b1fbf0ab1b1e4cd75ee1bb5f8cf4ba65bce8bb4a3ce0451c40d4cf',
    });
    const signTransaction = vi.fn().mockResolvedValue(transaction);
    const ctx = makeFakeOperationContext();
    const fns = createStacksSignerFnsFromHardwareWallet(
      makeFakeHardwareStacksSigner({ signTransaction }),
      key,
      ctx
    );

    await expect(fns.sign(transaction)).resolves.toBe(transaction);
    expect(signTransaction).toHaveBeenCalledWith(
      { transaction, derivationPath: key.derivationPath },
      ctx
    );
  });

  test('signs utf8 and structured messages with the account key', async () => {
    const signMessage = vi.fn().mockResolvedValue(signature);
    const signStructuredMessage = vi.fn().mockResolvedValue(signature);
    const ctx = makeFakeOperationContext();
    const fns = createStacksSignerFnsFromHardwareWallet(
      makeFakeHardwareStacksSigner({ signMessage, signStructuredMessage }),
      key,
      ctx
    );
    const message = Cl.stringAscii('hello');
    const domain = Cl.tuple({ name: Cl.stringAscii('app') });

    await expect(fns.signMessage('hello')).resolves.toBe(signature);
    await expect(fns.signStructuredMessage(message, domain)).resolves.toBe(signature);
    expect(signMessage).toHaveBeenCalledWith({ message: 'hello', ...key }, ctx);
    expect(signStructuredMessage).toHaveBeenCalledWith({ message, domain, ...key }, ctx);
  });
});
