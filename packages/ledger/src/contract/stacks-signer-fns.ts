import type {
  StacksSignMessageFn,
  StacksSignStructuredMessageFn,
  StacksSignerFn,
} from '@leather.io/stacks';

import type { HardwareStacksSigner, OperationContext } from './hardware-wallet';

interface HardwareStacksKey {
  derivationPath: string;
  publicKey: string;
}

interface HardwareStacksSignerFns {
  signFn: StacksSignerFn;
  signMessageFn: StacksSignMessageFn;
  signStructuredMessageFn: StacksSignStructuredMessageFn;
}

export function createStacksSignerFnsFromHardwareWallet(
  signer: HardwareStacksSigner,
  { derivationPath, publicKey }: HardwareStacksKey,
  ctx: OperationContext
): HardwareStacksSignerFns {
  return {
    signFn(transaction) {
      return signer.signTransaction({ transaction, derivationPath }, ctx);
    },
    signMessageFn(message) {
      return signer.signMessage({ message, derivationPath, publicKey }, ctx);
    },
    signStructuredMessageFn(message, domain) {
      return signer.signStructuredMessage({ message, domain, derivationPath, publicKey }, ctx);
    },
  };
}
