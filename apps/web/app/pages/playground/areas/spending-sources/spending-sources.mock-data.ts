import type { SpendingSource } from './spending-sources.utils';

export interface SpendingScenario {
  amountSats: number;
  recipient: string;
  requester: string;
  sources: SpendingSource[];
}

const sbtcRequester = 'https://sbtc.stacks.co';
const sbtcDepositAddress = 'bc1pzqqzn3k7tx6vdj2yjz5rvf9e8qn6f0h4dl3m2cw8xe5ry7ugs4kqa2mwnt';
const transferAmountSats = 442_000;

export const mockAccount = {
  name: 'Account 1',
  nativeSegwitAddress: 'bc1q8rv5fk3yq2cgj0xk7d4x9mv6hjtfqshz3e0w5n',
};

export const mockBtcPriceUsd = 100_000;

export const mixedScenario: SpendingScenario = {
  amountSats: transferAmountSats,
  recipient: sbtcDepositAddress,
  requester: sbtcRequester,
  sources: [
    { type: 'nativeSegwit', coinsSats: [301_000, 111_000] },
    { type: 'taproot', coinsSats: [32_000, 10_000, 10_000] },
  ],
};

export const taprootAvoidableScenario: SpendingScenario = {
  amountSats: transferAmountSats,
  recipient: sbtcDepositAddress,
  requester: sbtcRequester,
  sources: [
    { type: 'nativeSegwit', coinsSats: [300_000, 200_000] },
    { type: 'taproot', coinsSats: [350_000, 10_000, 10_000] },
  ],
};
