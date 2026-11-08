import { useMemo } from 'react';

import type { TransactionOutput } from '@scure/btc-signer/psbt';

import { BitcoinError, getParsedOutputs } from '@leather.io/bitcoin';
import type { NetworkConfiguration } from '@leather.io/models';

import { useCurrentAccountNativeSegwitIndexZeroPayer } from '@app/store/accounts/blockchain/bitcoin/native-segwit-account.hooks';
import { useCurrentAccountTaprootIndexZeroPayer } from '@app/store/accounts/blockchain/bitcoin/taproot-account.hooks';

export interface PsbtOutput {
  address: string | null;
  isMutable: boolean;
  toSign: boolean;
  value: number;
}

interface UseParsedOutputsArgs {
  isPsbtMutable: boolean;
  outputs: TransactionOutput[];
  network: NetworkConfiguration;
}

interface ParsedOutputsResult {
  parsedOutputs: PsbtOutput[];
  outputsError: BitcoinError | null;
}
export function useParsedOutputs({
  isPsbtMutable,
  outputs,
  network,
}: UseParsedOutputsArgs): ParsedOutputsResult {
  const bitcoinAddressNativeSegwit = useCurrentAccountNativeSegwitIndexZeroPayer().address;
  const { address: bitcoinAddressTaproot } = useCurrentAccountTaprootIndexZeroPayer();
  const networkMode = network.chain.bitcoin.mode;

  return useMemo(() => {
    try {
      return {
        parsedOutputs: getParsedOutputs({
          isPsbtMutable,
          outputs,
          networkMode,
          psbtAddresses: [bitcoinAddressNativeSegwit, bitcoinAddressTaproot],
        }),
        outputsError: null,
      };
    } catch (error) {
      if (!(error instanceof BitcoinError)) throw error;
      return { parsedOutputs: [], outputsError: error };
    }
  }, [bitcoinAddressNativeSegwit, bitcoinAddressTaproot, isPsbtMutable, networkMode, outputs]);
}
