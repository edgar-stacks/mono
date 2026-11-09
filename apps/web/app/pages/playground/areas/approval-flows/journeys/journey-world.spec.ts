import { describe, expect, test } from 'vitest';

import { assetAmount } from '../scenarios/approval-assets';
import {
  type WorldTransaction,
  accountUsdValue,
  applyWorldTransactions,
  createJourneyWorld,
  journeyAccounts,
} from './journey-world';

const send: Omit<WorldTransaction, 'status' | 'feeCharged'> = {
  accountId: 'account-1',
  movements: [{ direction: 'out', amount: assetAmount('STX', 250) }],
  fee: assetAmount('STX', 0.003),
};

function stxBalance(transactions: WorldTransaction[]) {
  const [account] = applyWorldTransactions(createJourneyWorld('software'), transactions);
  return account.balances.STX;
}

const startingStx = assetAmount('STX', 18_250).baseUnits;

describe('journeyAccounts', () => {
  test('uses a software or Ledger personal account and two vaults', () => {
    expect(journeyAccounts('software').personal.kind).toBe('software');
    expect(journeyAccounts('ledger').personal.kind).toBe('ledger');
    expect(journeyAccounts('ledger').bitcoinVault.kind).toBe('vault');
    expect(journeyAccounts('ledger').stacksVault.addresses.stacks).toBeDefined();
  });
});

describe('applyWorldTransactions', () => {
  test('pending transactions move nothing', () => {
    expect(stxBalance([{ ...send, status: 'pending', feeCharged: false }])).toBe(startingStx);
  });

  test('confirmed transactions apply movements and the charged fee', () => {
    expect(stxBalance([{ ...send, status: 'confirmed', feeCharged: true }])).toBe(
      startingStx - assetAmount('STX', 250.003).baseUnits
    );
  });

  test('failed transactions keep only the charged fee', () => {
    expect(stxBalance([{ ...send, status: 'failed', feeCharged: true }])).toBe(
      startingStx - assetAmount('STX', 0.003).baseUnits
    );
  });

  test('transactions only change their own account', () => {
    const world = applyWorldTransactions(createJourneyWorld('software'), [
      { ...send, accountId: 'vault-stx', status: 'confirmed', feeCharged: true },
    ]);
    expect(world[0].balances.STX).toBe(startingStx);
    expect(world[2].balances.STX).toBe(assetAmount('STX', 86_400 - 250.003).baseUnits);
  });

  test('receiving increases the portfolio value', () => {
    const before = accountUsdValue(createJourneyWorld('software')[0]);
    const [after] = applyWorldTransactions(createJourneyWorld('software'), [
      {
        accountId: 'account-1',
        movements: [{ direction: 'in', amount: assetAmount('BTC', 0.001) }],
        fee: null,
        feeCharged: false,
        status: 'confirmed',
      },
    ]);
    expect(accountUsdValue(after)).toBeCloseTo(before + 68);
  });
});
