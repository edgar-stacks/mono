import type { SpendingSource } from './spending-sources.utils';

export interface SpendingScenario {
  requester: string;
  recipient: string;
  amountSats: number;
  sources: SpendingSource[];
}

const requester = 'https://sbtc.stacks.co';
const sbtcDepositAddress = 'bc1pqwz7ewckh3kr9ucgz4wz8tetvnjtqwyptaxdm8j3x2ccf6r7fqvqlxr5rf';
const amountSats = 442_000;

export const mockAccount = {
  name: 'Account 1',
  nativeSegwitAddress: 'bc1q9h7garjqw2mxwg7rxzg8fk5qzsj7a2ns6w8kuy',
};

function createSources(nativeSegwitCoins: number[], taprootCoins: number[]): SpendingSource[] {
  return [
    {
      type: 'nativeSegwit',
      label: 'Native SegWit',
      prefix: 'bc1q',
      coins: nativeSegwitCoins,
      mayHoldCollectibles: false,
    },
    {
      type: 'taproot',
      label: 'Taproot',
      prefix: 'bc1p',
      coins: taprootCoins,
      mayHoldCollectibles: true,
    },
  ];
}

export const mixedScenario: SpendingScenario = {
  requester,
  recipient: sbtcDepositAddress,
  amountSats,
  sources: createSources([301_000, 111_000], [32_000, 10_000, 10_000]),
};

export const taprootAvoidableScenario: SpendingScenario = {
  requester,
  recipient: sbtcDepositAddress,
  amountSats,
  sources: createSources([300_000, 200_000], [350_000, 10_000, 10_000]),
};
