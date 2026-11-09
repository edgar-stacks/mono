import type { TransactionOutput } from '@scure/btc-signer/psbt';

import { type BitcoinAddress, type BitcoinNetworkModes } from '@leather.io/models';
import { isUndefined } from '@leather.io/utils';

import { getBtcSignerLibNetworkConfigByMode } from '../utils/bitcoin.network';
import { getAddressFromOutScript, getOutputScriptType } from '../utils/bitcoin.utils';
import { BitcoinError } from '../validation/bitcoin-error';

export interface PsbtOutput {
  address: BitcoinAddress | null;
  isMutable: boolean;
  toSign: boolean;
  value: number;
  scriptType: string;
}

export interface PsbtOutputWithAddress extends PsbtOutput {
  address: BitcoinAddress;
}

interface GetParsedOutputsArgs {
  isPsbtMutable: boolean;
  outputs: TransactionOutput[];
  networkMode: BitcoinNetworkModes;
  psbtAddresses: BitcoinAddress[];
}

export function getParsedOutputs({
  isPsbtMutable,
  outputs,
  networkMode,
  psbtAddresses,
}: GetParsedOutputsArgs): PsbtOutput[] {
  const bitcoinNetwork = getBtcSignerLibNetworkConfigByMode(networkMode);

  return outputs.map(output => {
    if (isUndefined(output.script)) throw new BitcoinError('PsbtOutputMissingScript');
    const outputAddress = getAddressFromOutScript(output.script, bitcoinNetwork);

    const isCurrentAddress = !!outputAddress && psbtAddresses.includes(outputAddress);

    return {
      address: outputAddress,
      isMutable: isPsbtMutable,
      toSign: isCurrentAddress,
      value: Number(output.amount),
      scriptType: getOutputScriptType(output.script),
    };
  });
}
