import * as btc from '@scure/btc-signer';
import { Psbt } from 'bitcoinjs-lib';

import {
  compileWshDescriptor,
  findAccountDescriptorKey,
  getBitcoinJsLibNetworkConfigByMode,
  inferPaymentTypeFromPath,
  toWalletPolicyDescriptor,
} from '@leather.io/bitcoin';
import type { HardwareBitcoinSigner, OperationContext } from '@leather.io/ledger';

import { type BitcoinInputSigningConfig } from '@shared/crypto/bitcoin/signer-config';
import { logger } from '@shared/logger';
import { analytics } from '@shared/utils/analytics';

import { useHardwareBitcoinInputsToSign } from '@app/features/ledger/hardware-wallet/use-hardware-bitcoin-inputs-to-sign';
import {
  useCurrentNativeSegwitAccount,
  useUpdateLedgerSpecificNativeSegwitUtxoHexForAdddressIndexZero,
} from '@app/store/accounts/blockchain/bitcoin/native-segwit-account.hooks';
import { useCurrentNetwork } from '@app/store/networks/networks.selectors';

interface SignHardwareBitcoinTxArgs {
  psbt: Uint8Array;
  inputsToSign: BitcoinInputSigningConfig[];
  descriptor?: string;
}

export function useSignHardwareBitcoinTx() {
  const network = useCurrentNetwork();
  const nativeSegwitAccount = useCurrentNativeSegwitAccount();
  const resolveInputsToSign = useHardwareBitcoinInputsToSign();
  const addNonWitnessUtxo = useUpdateLedgerSpecificNativeSegwitUtxoHexForAdddressIndexZero();
  const bitcoinNetworkMode = network.chain.bitcoin.mode;

  function toPolicyDescriptor(descriptor: string) {
    if (!nativeSegwitAccount) throw new Error('No native segwit account available');

    // Ledger can only sign through a wallet policy keyed by `[fingerprint/path]xpub`,
    // so rewrite the account's key (a bare xpub or a raw 0/0 pubkey) into that form.
    const compiled = compileWshDescriptor(descriptor);
    const accountDescriptorKey = findAccountDescriptorKey(compiled, nativeSegwitAccount.keychain);
    if (!accountDescriptorKey) throw new Error('Current account is not part of this descriptor');

    return toWalletPolicyDescriptor(
      descriptor,
      accountDescriptorKey.key,
      nativeSegwitAccount.xpub,
      nativeSegwitAccount.keyOrigin
    );
  }

  async function addDescriptorNonWitnessUtxos(
    psbt: Psbt,
    signingConfig: BitcoinInputSigningConfig[]
  ) {
    // Ledger needs the full previous transaction to verify each segwit input's
    // amount; without it the device signs but warns "Unverified inputs". Adding
    // it is best-effort — signing still succeeds (with the warning) if it fails.
    try {
      await addNonWitnessUtxo(psbt, signingConfig);
    } catch {
      logger.warn(
        'Failed to add non-witness UTXO; Ledger will sign with unverified inputs warning'
      );
    }
  }

  async function addNativeSegwitNonWitnessUtxos(
    psbt: Psbt,
    signingConfig: BitcoinInputSigningConfig[]
  ) {
    const nativeSegwitInputsToSign = signingConfig.filter(
      ({ derivationPath }) => inferPaymentTypeFromPath(derivationPath) === 'p2wpkh'
    );
    if (!nativeSegwitInputsToSign.length) return;

    // Without adding the full non-witness data, the Ledger will present a
    // warning. In some cases, e.g. bip322, the original witness data doesn't
    // exist, and we want the user to proceed, despite the warning.
    try {
      await addNonWitnessUtxo(psbt, nativeSegwitInputsToSign);
      analytics.track('native_segwit_tx_hex_to_ledger_tx', { success: true });
    } catch {
      analytics.track('native_segwit_tx_hex_to_ledger_tx', { success: false });
    }
  }

  return async (
    signer: HardwareBitcoinSigner,
    { psbt: rawPsbt, inputsToSign, descriptor }: SignHardwareBitcoinTxArgs,
    ctx: OperationContext
  ) => {
    const policyDescriptor = descriptor ? toPolicyDescriptor(descriptor) : undefined;

    // BtcSigner not compatible with Ledger. Encoded format returns more terse
    // version. BitcoinJsLib works.
    const psbt = Psbt.fromBuffer(Buffer.from(rawPsbt), {
      network: getBitcoinJsLibNetworkConfigByMode(bitcoinNetworkMode),
    });

    if (descriptor) await addDescriptorNonWitnessUtxos(psbt, inputsToSign);
    else await addNativeSegwitNonWitnessUtxos(psbt, inputsToSign);

    const signedPsbt = await signer.signPsbt(
      {
        psbt: psbt.toBuffer(),
        network: bitcoinNetworkMode,
        inputsToSign: resolveInputsToSign(inputsToSign),
        policyDescriptor,
      },
      ctx
    );

    // Turn back into BtcSigner lib format
    // REMINDER: this tx is not finalized
    return btc.Transaction.fromPSBT(signedPsbt);
  };
}
