import type { SpendingSource } from './spending-sources.utils';

export interface SpendingSourcesScenario {
  amountSats: number;
  recipient: string;
  requester: string;
  sources: SpendingSource[];
}

const transferAmountSats = 442_000;
const sbtcDepositAddress = 'bc1pjqx9dpc5zl8nrdjz9n8dt6a6t6gcq9u0lw3x4ttx0uqtnyfhgy5q2uc4mr';
const sbtcRequester = 'https://sbtc.stacks.co';

export const mockAccount = {
  name: 'Account 1',
  nativeSegwitAddress: 'bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el',
  btcPriceUsd: 100_000,
};

export const mixedScenario: SpendingSourcesScenario = {
  amountSats: transferAmountSats,
  recipient: sbtcDepositAddress,
  requester: sbtcRequester,
  sources: [
    { type: 'nativeSegwit', coins: [301_000, 111_000], mayHoldCollectibles: false },
    { type: 'taproot', coins: [32_000, 10_000, 10_000], mayHoldCollectibles: true },
  ],
};

export const taprootAvoidableScenario: SpendingSourcesScenario = {
  amountSats: transferAmountSats,
  recipient: sbtcDepositAddress,
  requester: sbtcRequester,
  sources: [
    { type: 'nativeSegwit', coins: [300_000, 200_000], mayHoldCollectibles: false },
    { type: 'taproot', coins: [350_000, 10_000, 10_000], mayHoldCollectibles: true },
  ],
};
