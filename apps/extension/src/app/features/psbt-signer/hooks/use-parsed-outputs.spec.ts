import type * as ReactModule from 'react';

import { hexToBytes } from '@noble/hashes/utils';
import * as btc from '@scure/btc-signer';
import { describe, expect, test, vi } from 'vitest';

import { BitcoinError } from '@leather.io/bitcoin';
import { defaultCurrentNetwork } from '@leather.io/models';

import { useParsedOutputs } from './use-parsed-outputs';

const nativeSegwitPayment = btc.p2wpkh(hexToBytes('02'.padEnd(66, '3')), btc.NETWORK);
const recipientPayment = btc.p2wpkh(hexToBytes('03'.padEnd(66, '7')), btc.NETWORK);
const taprootAddress = 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297';

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
  useCurrentAccountNativeSegwitIndexZeroPayer: () => ({ address: nativeSegwitPayment.address }),
}));

vi.mock('@app/store/accounts/blockchain/bitcoin/taproot-account.hooks', () => ({
  useCurrentAccountTaprootIndexZeroPayer: () => ({ address: taprootAddress }),
}));

describe(useParsedOutputs.name, () => {
  test('returns every output when all outputs have a script', () => {
    const result = useParsedOutputs({
      isPsbtMutable: false,
      network: defaultCurrentNetwork,
      outputs: [
        { script: recipientPayment.script, amount: 10_000n },
        { script: nativeSegwitPayment.script, amount: 5_000n },
      ],
    });

    expect(result.outputsError).toBeNull();
    expect(result.parsedOutputs).toEqual([
      expect.objectContaining({ address: recipientPayment.address, toSign: false, value: 10_000 }),
      expect.objectContaining({ address: nativeSegwitPayment.address, toSign: true, value: 5_000 }),
    ]);
  });

  test('returns a typed error and no outputs when an output has no script', () => {
    const result = useParsedOutputs({
      isPsbtMutable: false,
      network: defaultCurrentNetwork,
      outputs: [{ script: recipientPayment.script, amount: 10_000n }, { amount: 5_000n }],
    });

    expect(result.parsedOutputs).toEqual([]);
    expect(result.outputsError).toBeInstanceOf(BitcoinError);
    expect(result.outputsError?.message).toBe('PsbtOutputMissingScript');
  });
});
