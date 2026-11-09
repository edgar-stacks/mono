import type {
  ConnectRequest,
  HardwareBitcoinSigner,
  HardwareStacksSigner,
  HardwareWallet,
  HardwareWalletConnector,
  OperationContext,
} from './hardware-wallet';
import { HardwareWalletError, throwIfOperationAborted } from './hardware-wallet-error';

function rejectWhenAborted(signal: AbortSignal | undefined, cleanup: AbortSignal) {
  return new Promise<never>((_resolve, reject) => {
    signal?.addEventListener('abort', () => reject(new HardwareWalletError('cancelled')), {
      once: true,
      signal: cleanup,
    });
  });
}

export async function withHardwareWallet<Result>(
  connector: HardwareWalletConnector,
  request: ConnectRequest,
  ctx: OperationContext,
  operation: (wallet: HardwareWallet) => Promise<Result>
): Promise<Result> {
  throwIfOperationAborted(ctx.signal);
  const session = await connector.connect(request, ctx);
  const cleanup = new AbortController();
  try {
    throwIfOperationAborted(ctx.signal);
    return await Promise.race([operation(session), rejectWhenAborted(ctx.signal, cleanup.signal)]);
  } finally {
    cleanup.abort();
    await session.close();
  }
}

export function getBitcoinSigner(wallet: HardwareWallet): HardwareBitcoinSigner {
  if (!wallet.bitcoin)
    throw new HardwareWalletError(
      'unsupported',
      'This hardware wallet session cannot sign Bitcoin'
    );
  return wallet.bitcoin;
}

export function getStacksSigner(wallet: HardwareWallet): HardwareStacksSigner {
  if (!wallet.stacks)
    throw new HardwareWalletError('unsupported', 'This hardware wallet session cannot sign Stacks');
  return wallet.stacks;
}
