import { signatureVrsToRsv } from '@stacks/common';
import { AddressVersion, serializeCV, serializeTransaction } from '@stacks/transactions';
import { LedgerError, type ResponseSign } from '@zondax/ledger-stacks';

import type {
  HardwareStacksAccountKey,
  HardwareStacksSigner,
  OperationContext,
} from '../contract/hardware-wallet';
import { HardwareWalletError, throwIfAborted } from '../contract/hardware-wallet-error';
import { makeLedgerAppResponseError } from '../dmk/ledger-dmk-errors';
import type { LedgerStacksApp } from '../ledger-app';
import {
  decompressSecp256k1PublicKey,
  getStacksMasterFingerprint,
  hasLedgerReturnCode,
  isStxAddressResponseRejected,
  isStxAddressResponseSuccess,
  requestPublicKeyForIdentityAccount,
  requestPublicKeyForStxAccount,
  showStxAddressOnDevice,
  signLedgerStacksStructuredMessage,
  signLedgerStacksTransaction,
  signLedgerStacksUtf8Message,
  signStacksTransactionWithSignature,
} from '../stacks/stacks-ledger-utils';
import { withLedgerErrors } from './ledger-error-mapping';

const addressVerificationRejectedMessage = 'Address verification was rejected on the device.';

function assertSignResponseSucceeded(response: ResponseSign): void {
  if (!hasLedgerReturnCode(response, LedgerError.NoErrors))
    throw makeLedgerAppResponseError(response);
}

function confirmOnDevice(ctx: OperationContext) {
  throwIfAborted(ctx.signal);
  ctx.onInteraction?.({ type: 'confirm-on-device' });
}

export function createLedgerStacksSigner(app: LedgerStacksApp): HardwareStacksSigner {
  return {
    getMasterFingerprint: withLedgerErrors(async () => getStacksMasterFingerprint(app)),

    requestAccountKeys: withLedgerErrors(async ({ accounts, onRequestKey }, ctx) => {
      const fingerprint = await getStacksMasterFingerprint(app);
      const keys: HardwareStacksAccountKey[] = [];
      for (const [index, { derivationPath, identityDerivationPath }] of accounts.entries()) {
        throwIfAborted(ctx.signal);
        onRequestKey?.(index);
        const stxPublicKeyResponse = await requestPublicKeyForStxAccount(app)(derivationPath);
        if (!stxPublicKeyResponse.publicKey) throw makeLedgerAppResponseError(stxPublicKeyResponse);

        const dataPublicKeyResponse = identityDerivationPath
          ? await requestPublicKeyForIdentityAccount(app)(identityDerivationPath)
          : null;
        if (dataPublicKeyResponse && !dataPublicKeyResponse.publicKey)
          throw makeLedgerAppResponseError(dataPublicKeyResponse);

        keys.push({
          derivationPath,
          stxPublicKey: stxPublicKeyResponse.publicKey.toString('hex'),
          // We return a decompressed public key, to match the behaviour of
          // @stacks/wallet-sdk. I'm not sure why we return an uncompressed key
          // typically compressed keys are used
          dataPublicKey: dataPublicKeyResponse
            ? decompressSecp256k1PublicKey(dataPublicKeyResponse.publicKey.toString('hex'))
            : null,
        });
      }
      return { fingerprint, keys };
    }),

    signTransaction: withLedgerErrors(async ({ transaction, derivationPath }, ctx) => {
      const unsignedTransaction = serializeTransaction(transaction);
      confirmOnDevice(ctx);
      const response = await signLedgerStacksTransaction(app)(
        Buffer.from(unsignedTransaction, 'hex'),
        derivationPath
      );
      assertSignResponseSucceeded(response);
      return signStacksTransactionWithSignature(unsignedTransaction, response.signatureVRS);
    }),

    signMessage: withLedgerErrors(async ({ message, derivationPath, publicKey }, ctx) => {
      confirmOnDevice(ctx);
      const response = await signLedgerStacksUtf8Message(app)(message, derivationPath);
      assertSignResponseSucceeded(response);
      return { signature: signatureVrsToRsv(response.signatureVRS.toString('hex')), publicKey };
    }),

    signStructuredMessage: withLedgerErrors(
      async ({ message, domain, derivationPath, publicKey }, ctx) => {
        confirmOnDevice(ctx);
        const response = await signLedgerStacksStructuredMessage(app)(
          serializeCV(domain),
          serializeCV(message),
          derivationPath
        );
        assertSignResponseSucceeded(response);
        return { signature: signatureVrsToRsv(response.signatureVRS.toString('hex')), publicKey };
      }
    ),

    showAddress: withLedgerErrors(async ({ derivationPath, network }, ctx) => {
      throwIfAborted(ctx.signal);
      ctx.onInteraction?.({ type: 'verify-address' });
      const response = await showStxAddressOnDevice(app)(
        derivationPath,
        network === 'mainnet' ? AddressVersion.MainnetSingleSig : AddressVersion.TestnetSingleSig
      );
      if (isStxAddressResponseRejected(response))
        throw new HardwareWalletError('rejected', addressVerificationRejectedMessage);
      if (!isStxAddressResponseSuccess(response)) throw makeLedgerAppResponseError(response);
      return response.address;
    }),
  };
}
