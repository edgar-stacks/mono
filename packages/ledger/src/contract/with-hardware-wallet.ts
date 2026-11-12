import type {
  ConnectRequest,
  HardwareBitcoinSigner,
  HardwareStacksSigner,
  HardwareWallet,
  HardwareWalletConnector,
} from './hardware-wallet';
import { HardwareWalletError, throwIfOperationAborted } from './hardware-wallet-error';
import type { OperationContext } from './operation-context';

export async function withHardwareWallet<T>(
  connector: HardwareWalletConnector,
  request: ConnectRequest,
  ctx: OperationContext,
  operation: (wallet: HardwareWallet) => Promise<T>
): Promise<T> {
  throwIfOperationAborted(ctx.signal);
  const session = await connector.connect(request, ctx);
  try {
    throwIfOperationAborted(ctx.signal);
    return await operation(session);
  } finally {
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
