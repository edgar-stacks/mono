import type {
  StacksSignMessageFn,
  StacksSignStructuredMessageFn,
  StacksSignerFn,
} from '@leather.io/stacks';

import type { HardwareStacksKey, HardwareStacksSigner } from './hardware-wallet';
import type { OperationContext } from './operation-context';

interface HardwareStacksSignerFns {
  sign: StacksSignerFn;
  signMessage: StacksSignMessageFn;
  signStructuredMessage: StacksSignStructuredMessageFn;
}

export function createStacksSignerFnsFromHardwareWallet(
  signer: HardwareStacksSigner,
  key: HardwareStacksKey,
  ctx: OperationContext
): HardwareStacksSignerFns {
  return {
    sign(transaction) {
      return signer.signTransaction({ transaction, derivationPath: key.derivationPath }, ctx);
    },
    signMessage(message) {
      return signer.signMessage({ ...key, message }, ctx);
    },
    signStructuredMessage(message, domain) {
      return signer.signStructuredMessage({ ...key, message, domain }, ctx);
    },
  };
}
