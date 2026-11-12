import { HardwareWalletError } from './hardware-wallet-error';
import {
  makeFakeHardwareBitcoinSigner,
  makeFakeHardwareStacksSigner,
  makeFakeHardwareWallet,
  makeFakeHardwareWalletConnector,
  makeFakeOperationContext,
} from './hardware-wallet.test-utils';
import { getBitcoinSigner, getStacksSigner, withHardwareWallet } from './with-hardware-wallet';

const stacksRequest = { chain: 'stacks' } as const;

describe(withHardwareWallet.name, () => {
  test('runs the operation on the connected wallet and closes the session', async () => {
    const session = makeFakeHardwareWallet();
    const connector = makeFakeHardwareWalletConnector(session);
    const ctx = makeFakeOperationContext();
    const operation = vi.fn().mockResolvedValue('signed');

    await expect(withHardwareWallet(connector, stacksRequest, ctx, operation)).resolves.toBe(
      'signed'
    );

    expect(connector.connect).toHaveBeenCalledWith(stacksRequest, ctx);
    expect(operation).toHaveBeenCalledWith(session);
    expect(session.close).toHaveBeenCalledOnce();
  });

  test('closes the session when the operation fails', async () => {
    const session = makeFakeHardwareWallet();
    const connector = makeFakeHardwareWalletConnector(session);
    const failure = new HardwareWalletError('rejected');

    await expect(
      withHardwareWallet(connector, stacksRequest, makeFakeOperationContext(), () =>
        Promise.reject(failure)
      )
    ).rejects.toBe(failure);

    expect(session.close).toHaveBeenCalledOnce();
  });

  test('closes the session when the operation is aborted', async () => {
    const session = makeFakeHardwareWallet();
    const connector = makeFakeHardwareWalletConnector(session);
    const controller = new AbortController();
    const ctx = makeFakeOperationContext({ signal: controller.signal });

    const running = withHardwareWallet(connector, stacksRequest, ctx, () => {
      controller.abort();
      return Promise.reject(new HardwareWalletError('cancelled'));
    });

    await expect(running).rejects.toMatchObject({ kind: 'cancelled' });
    expect(session.close).toHaveBeenCalledOnce();
  });

  test('closes the session without running the operation when aborted while connecting', async () => {
    const session = makeFakeHardwareWallet();
    const connector = makeFakeHardwareWalletConnector(session);
    const controller = new AbortController();
    connector.connect.mockImplementation(() => {
      controller.abort();
      return Promise.resolve(session);
    });
    const operation = vi.fn();

    await expect(
      withHardwareWallet(
        connector,
        stacksRequest,
        makeFakeOperationContext({ signal: controller.signal }),
        operation
      )
    ).rejects.toMatchObject({ kind: 'cancelled' });

    expect(operation).not.toHaveBeenCalled();
    expect(session.close).toHaveBeenCalledOnce();
  });

  test('does not connect once the operation is already aborted', async () => {
    const connector = makeFakeHardwareWalletConnector();
    const controller = new AbortController();
    controller.abort();

    await expect(
      withHardwareWallet(
        connector,
        stacksRequest,
        makeFakeOperationContext({ signal: controller.signal }),
        vi.fn()
      )
    ).rejects.toMatchObject({ kind: 'cancelled' });

    expect(connector.connect).not.toHaveBeenCalled();
  });

  test('passes a connection failure through without a session to close', async () => {
    const connector = makeFakeHardwareWalletConnector();
    const failure = new HardwareWalletError('locked');
    connector.connect.mockRejectedValue(failure);
    const operation = vi.fn();

    await expect(
      withHardwareWallet(connector, stacksRequest, makeFakeOperationContext(), operation)
    ).rejects.toBe(failure);

    expect(operation).not.toHaveBeenCalled();
  });
});

describe(getBitcoinSigner.name, () => {
  test('returns the Bitcoin signer of the wallet', () => {
    const bitcoin = makeFakeHardwareBitcoinSigner();

    expect(getBitcoinSigner(makeFakeHardwareWallet({ bitcoin }))).toBe(bitcoin);
  });

  test('throws an unsupported error when the wallet cannot sign Bitcoin', () => {
    expect(() =>
      getBitcoinSigner(makeFakeHardwareWallet({ stacks: makeFakeHardwareStacksSigner() }))
    ).toThrow('This hardware wallet session cannot sign Bitcoin');
  });
});

describe(getStacksSigner.name, () => {
  test('returns the Stacks signer of the wallet', () => {
    const stacks = makeFakeHardwareStacksSigner();

    expect(getStacksSigner(makeFakeHardwareWallet({ stacks }))).toBe(stacks);
  });

  test('throws an unsupported error when the wallet cannot sign Stacks', () => {
    expect(() =>
      getStacksSigner(makeFakeHardwareWallet({ bitcoin: makeFakeHardwareBitcoinSigner() }))
    ).toThrow('This hardware wallet session cannot sign Stacks');
  });
});
