import { describe, expect, it } from 'vitest';

import {
  netBalanceChanges,
  summarizeActivityTrailing,
  unmappedContractCalls,
} from './activity-list-fixtures';
import { amount } from './approval-assets';

function spend(value: ReturnType<typeof amount>) {
  return { ...value, amount: -value.amount };
}

function findRow(id: string) {
  const row = unmappedContractCalls.find(candidate => candidate.id === id);
  if (!row) throw new Error(`Missing fixture ${id}`);
  return row;
}

describe('unmapped contract-call fixtures', () => {
  it('lists seven contract calls', () => {
    expect(unmappedContractCalls).toHaveLength(7);
  });

  it('covers confirmed, pending and failed rows', () => {
    const statuses = new Set(unmappedContractCalls.map(row => row.status));
    expect(statuses).toEqual(new Set(['confirmed', 'pending', 'failed']));
  });
});

describe(netBalanceChanges.name, () => {
  it('nets changes of the same asset and drops assets that end at zero', () => {
    const net = netBalanceChanges([
      amount('STX', 10),
      spend(amount('STX', 4)),
      amount('sBTC', 0.1),
      spend(amount('sBTC', 0.1)),
    ]);
    expect(net).toEqual([amount('STX', 6)]);
  });
});

describe(summarizeActivityTrailing.name, () => {
  it('keeps pending rows in their current presentation', () => {
    const row = findRow('claim-pending');
    expect(summarizeActivityTrailing(row.status, row.changes)).toBeNull();
  });

  it('keeps failed rows in their current presentation', () => {
    expect(summarizeActivityTrailing('failed', [spend(amount('STX', 5))])).toBeNull();
  });

  it('shows nothing for a confirmed call that changed no balance', () => {
    const row = findRow('vote');
    expect(summarizeActivityTrailing(row.status, row.changes)).toBeNull();
  });

  it('shows the amount and its fiat value for a single spend', () => {
    const row = findRow('mint');
    expect(summarizeActivityTrailing(row.status, row.changes)).toEqual({
      primary: '−25 STX',
      secondary: '−$15.50',
      tone: 'spent',
    });
  });

  it('shows a single receipt without fiat', () => {
    const row = findRow('zest-borrow');
    expect(summarizeActivityTrailing(row.status, row.changes)).toEqual({
      primary: '+500 aeUSDC',
      tone: 'received',
    });
  });

  it('puts the received asset above the spent asset', () => {
    const row = findRow('router-swap');
    expect(summarizeActivityTrailing(row.status, row.changes)).toEqual({
      primary: '+38,500 ALEX',
      secondary: '−250 STX',
      tone: 'received',
    });
  });

  it('counts three or more changed assets', () => {
    const row = findRow('add-liquidity');
    expect(summarizeActivityTrailing(row.status, row.changes)).toEqual({
      primary: '3 assets',
      secondary: '−$395.20',
      tone: 'spent',
    });
  });
});
