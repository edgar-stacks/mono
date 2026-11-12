import { signatureVrsToRsv } from '@stacks/common';
import { serializeCV, serializeTransaction } from '@stacks/transactions';
import {
  LedgerError,
  type ResponseAddress,
  type ResponseBase,
  type ResponseSign,
} from '@zondax/ledger-stacks';

import { makeStxDerivationPathForType } from '@leather.io/stacks';

import type {
  HardwareStacksAccountKey,
  HardwareStacksAccountKeys,
  HardwareStacksKey,
  HardwareStacksSigner,
  RequestStacksAccountKeysArgs,
} from '../contract/hardware-wallet';
import { HardwareWalletError } from '../contract/hardware-wallet-error';
import { makeLedgerAppResponseError } from '../dmk/ledger-dmk-errors';
import type { LedgerStacksApp } from '../ledger-app';
import {
  decompressSecp256k1PublicKey,
  getStacksMasterFingerprintHex,
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
  stacksChainIdToSingleSigAddressVersion,
} from '../stacks/stacks-ledger-utils';
import { withLedgerErrors } from './ledger-error-mapping';

function assertLedgerResponseSucceeded(response: ResponseBase): void {
  if (hasLedgerReturnCode(response, LedgerError.NoErrors)) return;
  if (hasLedgerReturnCode(response, LedgerError.DataIsInvalid))
    throw new HardwareWalletError('invalid-payload', response.errorMessage);
  if (hasLedgerReturnCode(response, LedgerError.TransactionRejected))
    throw new HardwareWalletError('rejected', response.errorMessage);
  throw makeLedgerAppResponseError(response);
}

function getPublicKeyHex(response: ResponseAddress): string {
  if (!response.publicKey) throw new HardwareWalletError('unknown', response.errorMessage);
  return response.publicKey.toString('hex');
}

function toSignatureData(response: ResponseSign, { publicKey }: HardwareStacksKey) {
  assertLedgerResponseSucceeded(response);
  return { signature: signatureVrsToRsv(response.signatureVRS.toString('hex')), publicKey };
}

async function requestAccountKeys(
  app: LedgerStacksApp,
  { derivationPathType, accountIndexes, onRequestKey }: RequestStacksAccountKeysArgs
): Promise<HardwareStacksAccountKeys> {
  const fingerprint = await getStacksMasterFingerprintHex(app);
  const keys: HardwareStacksAccountKey[] = [];
  for (const accountIndex of accountIndexes) {
    onRequestKey?.(accountIndex);
    const path = makeStxDerivationPathForType(derivationPathType, accountIndex);
    const stxPublicKeyResponse = await requestPublicKeyForStxAccount(app)(path);
    const dataPublicKeyResponse = await requestPublicKeyForIdentityAccount(app)(accountIndex);
    keys.push({
      path,
      stxPublicKey: getPublicKeyHex(stxPublicKeyResponse),
      dataPublicKey: decompressSecp256k1PublicKey(getPublicKeyHex(dataPublicKeyResponse)),
    });
  }
  return { fingerprint, keys };
}

export function createLedgerStacksSigner(app: LedgerStacksApp): HardwareStacksSigner {
  return {
    getMasterFingerprint() {
      return withLedgerErrors(() => getStacksMasterFingerprintHex(app));
    },
    requestAccountKeys(args) {
      return withLedgerErrors(() => requestAccountKeys(app, args));
    },
    signTransaction({ transaction, derivationPath }) {
      return withLedgerErrors(async () => {
        const unsignedTransaction = serializeTransaction(transaction);
        const response = await signLedgerStacksTransaction(app)(
          Buffer.from(unsignedTransaction, 'hex'),
          derivationPath
        );
        assertLedgerResponseSucceeded(response);
        return signStacksTransactionWithSignature(unsignedTransaction, response.signatureVRS);
      });
    },
    signMessage({ message, ...key }) {
      return withLedgerErrors(async () =>
        toSignatureData(await signLedgerStacksUtf8Message(app)(message, key.derivationPath), key)
      );
    },
    signStructuredMessage({ domain, message, ...key }) {
      return withLedgerErrors(async () =>
        toSignatureData(
          await signLedgerStacksStructuredMessage(app)(
            serializeCV(domain),
            serializeCV(message),
            key.derivationPath
          ),
          key
        )
      );
    },
    showAddress({ derivationPath, chainId }) {
      return withLedgerErrors(async () => {
        const response = await showStxAddressOnDevice(app)(
          derivationPath,
          stacksChainIdToSingleSigAddressVersion(chainId)
        );
        if (isStxAddressResponseRejected(response))
          throw new HardwareWalletError('rejected', response.errorMessage);
        if (!isStxAddressResponseSuccess(response))
          throw new HardwareWalletError('unknown', response.errorMessage);
        return response.address;
      });
    },
  };
}
