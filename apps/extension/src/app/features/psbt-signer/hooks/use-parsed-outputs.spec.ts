import type * as ReactModule from 'react';

import { hexToBytes } from '@noble/hashes/utils';
import * as btc from '@scure/btc-signer';

import { getAddressFromOutScript, getBtcSignerLibNetworkConfigByMode } from '@leather.io/bitcoin';
import { defaultCurrentNetwork } from '@leather.io/models';

import { useParsedOutputs } from './use-parsed-outputs';

const mocks = vi.hoisted(() => ({
  useCurrentAccountNativeSegwitIndexZeroPayer: vi.fn(),
  useCurrentAccountTaprootIndexZeroPayer: vi.fn(),
}));

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof ReactModule>();
  return {
    ...actual,
    useMemo<T>(factory: () => T) {
      return factory();
    },
  };
});

vi.mock('@app/store/accounts/blockchain/bitcoin/native-segwit-account.hooks', () => ({
  useCurrentAccountNativeSegwitIndexZeroPayer: mocks.useCurrentAccountNativeSegwitIndexZeroPayer,
}));

vi.mock('@app/store/accounts/blockchain/bitcoin/taproot-account.hooks', () => ({
  useCurrentAccountTaprootIndexZeroPayer: mocks.useCurrentAccountTaprootIndexZeroPayer,
}));

vi.mock('@shared/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

const bitcoinNetwork = getBtcSignerLibNetworkConfigByMode('mainnet');
const ownerScript = btc.p2wpkh(hexToBytes('02'.padEnd(66, '3'))).script;
const recipientScript = btc.p2wpkh(hexToBytes('03'.padEnd(66, '4'))).script;
const ownerAddress = getAddressFromOutScript(ownerScript, bitcoinNetwork);
const recipientAddress = getAddressFromOutScript(recipientScript, bitcoinNetwork);

describe('useParsedOutputs', () => {
  beforeEach(() => {
    mocks.useCurrentAccountNativeSegwitIndexZeroPayer.mockReturnValue({ address: ownerAddress });
    mocks.useCurrentAccountTaprootIndexZeroPayer.mockReturnValue({ address: 'taproot-address' });
  });

  it('parses every output when all outputs have a script', () => {
    const result = useParsedOutputs({
      isPsbtMutable: false,
      outputs: [
        { script: recipientScript, amount: 1_000n },
        { script: ownerScript, amount: 2_000n },
      ],
      network: defaultCurrentNetwork,
    });

    expect(result).toEqual({
      hasOutputWithoutScript: false,
      parsedOutputs: [
        { address: recipientAddress, isMutable: false, toSign: false, value: 1_000 },
        { address: ownerAddress, isMutable: false, toSign: true, value: 2_000 },
      ],
    });
  });

  it('flags the psbt instead of dropping an output without a script', () => {
    const result = useParsedOutputs({
      isPsbtMutable: false,
      outputs: [{ script: recipientScript, amount: 1_000n }, { amount: 2_000n }],
      network: defaultCurrentNetwork,
    });

    expect(result).toEqual({ hasOutputWithoutScript: true, parsedOutputs: [] });
  });
});
