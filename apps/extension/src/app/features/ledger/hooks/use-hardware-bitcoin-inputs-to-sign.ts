import * as btc from '@scure/btc-signer';

import { extractAddressIndexFromPath, extractChangeIndexFromPath } from '@leather.io/crypto';
import type { HardwareBitcoinInputToSign } from '@leather.io/ledger';

import type { BitcoinInputSigningConfig } from '@shared/crypto/bitcoin/signer-config';

import { useCurrentAccountNativeSegwitPayer } from '@app/store/accounts/blockchain/bitcoin/native-segwit-account.hooks';
import { useCurrentAccountTaprootPayer } from '@app/store/accounts/blockchain/bitcoin/taproot-account.hooks';

function isTaprootInput(tx: btc.Transaction, index: number) {
  const script = tx.getInput(index).witnessUtxo?.script;
  return script !== undefined && btc.OutScript.decode(script).type === 'tr';
}

export function useHardwareBitcoinInputsToSign() {
  const createNativeSegwitPayer = useCurrentAccountNativeSegwitPayer();
  const createTaprootPayer = useCurrentAccountTaprootPayer();

  return (
    psbt: Uint8Array,
    signingConfig: BitcoinInputSigningConfig[]
  ): HardwareBitcoinInputToSign[] => {
    const tx = btc.Transaction.fromPSBT(psbt);

    return signingConfig.map(({ index, derivationPath }) => {
      const createPayer = isTaprootInput(tx, index) ? createTaprootPayer : createNativeSegwitPayer;
      const payer = createPayer?.({
        changeIndex: extractChangeIndexFromPath(derivationPath),
        addressIndex: extractAddressIndexFromPath(derivationPath),
      });
      if (!payer) throw new Error(`Unable to resolve the public key for path ${derivationPath}`);
      return { index, derivationPath, publicKey: payer.publicKey };
    });
  };
}
