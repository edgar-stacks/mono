import { useMemo } from 'react';

import type { TransactionOutput } from '@scure/btc-signer/psbt';

import { getAddressFromOutScript, getBtcSignerLibNetworkConfigByMode } from '@leather.io/bitcoin';
import type { NetworkConfiguration } from '@leather.io/models';
import { isUndefined } from '@leather.io/utils';

import { logger } from '@shared/logger';

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
export function useParsedOutputs({ isPsbtMutable, outputs, network }: UseParsedOutputsArgs) {
  const bitcoinAddressNativeSegwit = useCurrentAccountNativeSegwitIndexZeroPayer().address;
  const { address: bitcoinAddressTaproot } = useCurrentAccountTaprootIndexZeroPayer();
  const bitcoinNetwork = getBtcSignerLibNetworkConfigByMode(network.chain.bitcoin.mode);

  return useMemo(() => {
    const parsedOutputs: PsbtOutput[] = [];
    for (const output of outputs) {
      if (isUndefined(output.script)) {
        logger.error('Output has no script');
        return { hasOutputWithoutScript: true, parsedOutputs: [] };
      }
      const outputAddress = getAddressFromOutScript(output.script, bitcoinNetwork);

      const isCurrentAddress =
        outputAddress === bitcoinAddressNativeSegwit || outputAddress === bitcoinAddressTaproot;

      parsedOutputs.push({
        address: outputAddress,
        isMutable: isPsbtMutable,
        toSign: isCurrentAddress,
        value: Number(output.amount),
      });
    }
    return { hasOutputWithoutScript: false, parsedOutputs };
  }, [bitcoinAddressNativeSegwit, bitcoinAddressTaproot, bitcoinNetwork, isPsbtMutable, outputs]);
}
