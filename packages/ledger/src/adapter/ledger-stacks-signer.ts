import { bytesToHex } from '@noble/hashes/utils';
import { signatureVrsToRsv } from '@stacks/common';
import { serializeCV, serializeTransaction } from '@stacks/transactions';

import { makeStxDerivationPathForType } from '@leather.io/stacks';

import type {
  HardwareStacksAccountKey,
  HardwareStacksSigner,
  OperationContext,
} from '../contract/hardware-wallet';
import { throwIfOperationAborted } from '../contract/hardware-wallet-error';
import type { LedgerStacksApp } from '../ledger-app';
import {
  decompressSecp256k1PublicKey,
  requestPublicKeyForIdentityAccount,
  requestPublicKeyForStxAccount,
  showStxAddressOnDevice,
  signLedgerStacksStructuredMessage,
  signLedgerStacksTransaction,
  signLedgerStacksUtf8Message,
  signStacksTransactionWithSignature,
  stacksChainIdToSingleSigAddressVersion,
} from '../stacks/stacks-ledger-utils';
import { assertLedgerAppResponseSucceeded, withLedgerErrors } from './ledger-error';

async function getMasterFingerprint({ app }: LedgerStacksApp) {
  const response = await app.getMasterFingerprint();
  assertLedgerAppResponseSucceeded(response);
  return bytesToHex(response.fingerprint);
}

async function getStxPublicKey(stacksApp: LedgerStacksApp, derivationPath: string) {
  const response = await requestPublicKeyForStxAccount(stacksApp)(derivationPath);
  assertLedgerAppResponseSucceeded(response);
  return response.publicKey.toString('hex');
}

async function getDataPublicKey(stacksApp: LedgerStacksApp, accountIndex: number) {
  const response = await requestPublicKeyForIdentityAccount(stacksApp)(accountIndex);
  assertLedgerAppResponseSucceeded(response);
  // We return a decompressed public key, to match the behaviour of
  // @stacks/wallet-sdk. I'm not sure why we return an uncompressed key
  // typically compressed keys are used
  return decompressSecp256k1PublicKey(response.publicKey.toString('hex'));
}

function startDeviceConfirmation(ctx: OperationContext) {
  throwIfOperationAborted(ctx.signal);
  ctx.onInteraction?.({ type: 'confirm-on-device' });
}

export function createLedgerStacksSigner(stacksApp: LedgerStacksApp): HardwareStacksSigner {
  return {
    getMasterFingerprint(ctx) {
      return withLedgerErrors(async () => {
        throwIfOperationAborted(ctx.signal);
        return getMasterFingerprint(stacksApp);
      });
    },
    getPublicKey({ derivationPath }, ctx) {
      return withLedgerErrors(async () => {
        throwIfOperationAborted(ctx.signal);
        return getStxPublicKey(stacksApp, derivationPath);
      });
    },
    requestAccountKeys({ derivationPathType, count, onRequestKey }, ctx) {
      return withLedgerErrors(async () => {
        throwIfOperationAborted(ctx.signal);
        const fingerprint = await getMasterFingerprint(stacksApp);
        const keys: HardwareStacksAccountKey[] = [];
        for (let accountIndex = 0; accountIndex < count; accountIndex++) {
          throwIfOperationAborted(ctx.signal);
          onRequestKey?.(accountIndex);
          const path = makeStxDerivationPathForType(derivationPathType, accountIndex);
          const stxPublicKey = await getStxPublicKey(stacksApp, path);
          const dataPublicKey = await getDataPublicKey(stacksApp, accountIndex);
          keys.push({ path, stxPublicKey, dataPublicKey });
        }
        return { fingerprint, keys };
      });
    },
    signTransaction({ transaction, derivationPath }, ctx) {
      return withLedgerErrors(async () => {
        startDeviceConfirmation(ctx);
        const unsignedTx = serializeTransaction(transaction);
        const response = await signLedgerStacksTransaction(stacksApp)(
          Buffer.from(unsignedTx, 'hex'),
          derivationPath
        );
        assertLedgerAppResponseSucceeded(response);
        return signStacksTransactionWithSignature(unsignedTx, response.signatureVRS);
      });
    },
    signMessage({ message, derivationPath, publicKey }, ctx) {
      return withLedgerErrors(async () => {
        startDeviceConfirmation(ctx);
        const response = await signLedgerStacksUtf8Message(stacksApp)(message, derivationPath);
        assertLedgerAppResponseSucceeded(response);
        return { signature: signatureVrsToRsv(response.signatureVRS.toString('hex')), publicKey };
      });
    },
    signStructuredMessage({ domain, message, derivationPath, publicKey }, ctx) {
      return withLedgerErrors(async () => {
        startDeviceConfirmation(ctx);
        const response = await signLedgerStacksStructuredMessage(stacksApp)(
          serializeCV(domain),
          serializeCV(message),
          derivationPath
        );
        assertLedgerAppResponseSucceeded(response);
        return { signature: signatureVrsToRsv(response.signatureVRS.toString('hex')), publicKey };
      });
    },
    showAddress({ derivationPath, chainId }, ctx) {
      return withLedgerErrors(async () => {
        throwIfOperationAborted(ctx.signal);
        ctx.onInteraction?.({ type: 'verify-address' });
        const response = await showStxAddressOnDevice(stacksApp)(
          derivationPath,
          stacksChainIdToSingleSigAddressVersion(chainId)
        );
        assertLedgerAppResponseSucceeded(response);
        return response.address;
      });
    },
  };
}
