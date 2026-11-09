import { HardwareWalletError, isHardwareWalletErrorKind } from './hardware-wallet-error';
import {
  makeFakeHardwareBitcoinSigner,
  makeFakeHardwareStacksSigner,
  makeFakeHardwareWallet,
  makeFakeHardwareWalletConnector,
  makeFakeHardwareWalletSession,
} from './hardware-wallet.test-utils';
import { getBitcoinSigner, getStacksSigner, withHardwareWallet } from './with-hardware-wallet';

function captureError(operation: () => unknown): unknown {
  try {
    operation();
  } catch (error) {
    return error;
  }
  return undefined;
}

const bitcoinRequest = { chain: 'bitcoin', network: 'mainnet' } as const;

function setup() {
  const session = makeFakeHardwareWalletSession(
    makeFakeHardwareWallet({ bitcoin: makeFakeHardwareBitcoinSigner() })
  );
  const connector = makeFakeHardwareWalletConnector({
    connect: vi.fn().mockResolvedValue(session),
  });
  return { session, connector };
}

describe(withHardwareWallet.name, () => {
  test('runs the operation on the connected wallet and closes the session on success', async () => {
    const { session, connector } = setup();
    const ctx = { onInteraction: vi.fn() };
    const operation = vi.fn().mockResolvedValue('signed');

    await expect(withHardwareWallet(connector, bitcoinRequest, ctx, operation)).resolves.toBe(
      'signed'
    );

    expect(connector.connect).toHaveBeenCalledWith(bitcoinRequest, ctx);
    expect(operation).toHaveBeenCalledWith(session);
    expect(session.close).toHaveBeenCalledOnce();
  });

  test('closes the session and rethrows when the operation fails', async () => {
    const { session, connector } = setup();
    const error = new HardwareWalletError('rejected');

    await expect(
      withHardwareWallet(connector, bitcoinRequest, {}, vi.fn().mockRejectedValue(error))
    ).rejects.toBe(error);

    expect(session.close).toHaveBeenCalledOnce();
  });

  test('rejects as cancelled and closes the session when the operation is aborted', async () => {
    const { session, connector } = setup();
    const controller = new AbortController();
    const operation = vi.fn(() => new Promise<never>(() => undefined));

    const running = withHardwareWallet(
      connector,
      bitcoinRequest,
      { signal: controller.signal },
      operation
    );
    await vi.waitFor(() => expect(operation).toHaveBeenCalled());
    controller.abort();

    await expect(running).rejects.toSatisfy(error => isHardwareWalletErrorKind(error, 'cancelled'));
    expect(session.close).toHaveBeenCalledOnce();
  });

  test('does not connect when the signal has already aborted', async () => {
    const { connector } = setup();
    const controller = new AbortController();
    controller.abort();

    await expect(
      withHardwareWallet(connector, bitcoinRequest, { signal: controller.signal }, vi.fn())
    ).rejects.toSatisfy(error => isHardwareWalletErrorKind(error, 'cancelled'));

    expect(connector.connect).not.toHaveBeenCalled();
  });

  test('does not close a session it never opened', async () => {
    const error = new HardwareWalletError('not-paired');
    const connector = makeFakeHardwareWalletConnector({
      connect: vi.fn().mockRejectedValue(error),
    });
    const operation = vi.fn();

    await expect(withHardwareWallet(connector, bitcoinRequest, {}, operation)).rejects.toBe(error);

    expect(operation).not.toHaveBeenCalled();
  });
});

describe(getBitcoinSigner.name, () => {
  test('returns the Bitcoin signer of the wallet', () => {
    const bitcoin = makeFakeHardwareBitcoinSigner();

    expect(getBitcoinSigner(makeFakeHardwareWallet({ bitcoin }))).toBe(bitcoin);
  });

  test('throws an unsupported error when the wallet has no Bitcoin signer', () => {
    expect(captureError(() => getBitcoinSigner(makeFakeHardwareWallet()))).toMatchObject({
      kind: 'unsupported',
    });
  });
});

describe(getStacksSigner.name, () => {
  test('returns the Stacks signer of the wallet', () => {
    const stacks = makeFakeHardwareStacksSigner();

    expect(getStacksSigner(makeFakeHardwareWallet({ stacks }))).toBe(stacks);
  });

  test('throws an unsupported error when the wallet has no Stacks signer', () => {
    expect(captureError(() => getStacksSigner(makeFakeHardwareWallet()))).toMatchObject({
      kind: 'unsupported',
    });
  });
});
