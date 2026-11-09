import type {
  StacksSignMessageFn,
  StacksSignStructuredMessageFn,
  StacksSignerFn,
} from '@leather.io/stacks';

import type {
  ConnectRequest,
  HardwareBitcoinSigner,
  HardwareStacksSigner,
  HardwareWallet,
  HardwareWalletConnector,
  OperationContext,
} from './hardware-wallet';
import { HardwareWalletError, throwIfAborted } from './hardware-wallet-error';

function waitForAbort(signal: AbortSignal) {
  return new Promise<never>((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new HardwareWalletError('cancelled')), {
      once: true,
    });
  });
}

export async function withHardwareWallet<T>(
  connector: HardwareWalletConnector,
  request: ConnectRequest,
  ctx: OperationContext,
  operation: (wallet: HardwareWallet) => Promise<T>
): Promise<T> {
  throwIfAborted(ctx.signal);
  const session = await connector.connect(request, ctx);
  try {
    throwIfAborted(ctx.signal);
    return await Promise.race([operation(session.wallet), waitForAbort(ctx.signal)]);
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

interface HardwareStacksSigningKey {
  derivationPath: string;
  publicKey: string;
}

interface HardwareStacksSignerFns {
  sign: StacksSignerFn;
  signMessage: StacksSignMessageFn;
  signStructuredMessage: StacksSignStructuredMessageFn;
}

export function createStacksSignerFnsFromHardwareWallet(
  signer: HardwareStacksSigner,
  { derivationPath, publicKey }: HardwareStacksSigningKey,
  ctx: OperationContext
): HardwareStacksSignerFns {
  return {
    sign(transaction) {
      return signer.signTransaction({ transaction, derivationPath }, ctx);
    },
    signMessage(message) {
      return signer.signMessage({ message, derivationPath, publicKey }, ctx);
    },
    signStructuredMessage(message, domain) {
      return signer.signStructuredMessage({ message, domain, derivationPath, publicKey }, ctx);
    },
  };
}
