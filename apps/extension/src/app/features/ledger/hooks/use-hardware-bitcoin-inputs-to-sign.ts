import { inferPaymentTypeFromPath } from '@leather.io/bitcoin';
import { extractAddressIndexFromPath, extractChangeIndexFromPath } from '@leather.io/crypto';
import type { HardwareBitcoinInputToSign } from '@leather.io/ledger';

import { type BitcoinInputSigningConfig } from '@shared/crypto/bitcoin/signer-config';

import { useCurrentAccountNativeSegwitPayer } from '@app/store/accounts/blockchain/bitcoin/native-segwit-account.hooks';
import { useCurrentAccountTaprootPayer } from '@app/store/accounts/blockchain/bitcoin/taproot-account.hooks';

export function useHardwareBitcoinInputsToSign() {
  const createNativeSegwitPayer = useCurrentAccountNativeSegwitPayer();
  const createTaprootPayer = useCurrentAccountTaprootPayer();

  return (inputsToSign: BitcoinInputSigningConfig[]): HardwareBitcoinInputToSign[] =>
    inputsToSign.map(({ index, derivationPath }) => {
      const addressIndexes = {
        changeIndex: extractChangeIndexFromPath(derivationPath),
        addressIndex: extractAddressIndexFromPath(derivationPath),
      };
      const payer =
        inferPaymentTypeFromPath(derivationPath) === 'p2tr'
          ? createTaprootPayer?.(addressIndexes)
          : createNativeSegwitPayer?.(addressIndexes);
      if (!payer) throw new Error(`Unable to resolve the public key for path ${derivationPath}`);
      return { index, derivationPath, publicKey: payer.publicKey };
    });
}
