import { type SpendingSource } from './spending-sources.utils';

export interface SpendingScenario {
  requester: string;
  recipient: string;
  amountSats: number;
  sources: SpendingSource[];
}

const sbtcRequester = 'https://sbtc.stacks.co';
const sbtcDepositAddress = 'bc1pr8ys0j5pmk4lr6pxsmkdfsh9u0nqc3jl6lzw5n6ru0k2zvhdyq7qq6tt9y';
const transferAmountSats = 442_000;

export const mixedScenario: SpendingScenario = {
  requester: sbtcRequester,
  recipient: sbtcDepositAddress,
  amountSats: transferAmountSats,
  sources: [
    { type: 'nativeSegwit', coinsSats: [301_000, 111_000], mayHoldCollectibles: false },
    { type: 'taproot', coinsSats: [32_000, 10_000, 10_000], mayHoldCollectibles: true },
  ],
};

export const taprootAvoidableScenario: SpendingScenario = {
  requester: sbtcRequester,
  recipient: sbtcDepositAddress,
  amountSats: transferAmountSats,
  sources: [
    { type: 'nativeSegwit', coinsSats: [300_000, 200_000], mayHoldCollectibles: false },
    { type: 'taproot', coinsSats: [350_000, 10_000, 10_000], mayHoldCollectibles: true },
  ],
};

export const mockAccount = {
  name: 'Account 1',
  nativeSegwitAddress: 'bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el',
  taprootAddress: 'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr',
};
