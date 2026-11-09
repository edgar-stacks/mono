import { describe, expect, it } from 'vitest';

import {
  type UnmappedActivityRow,
  getContractName,
  summarizeNetBalanceChange,
  unmappedActivityRows,
} from './activity-list-fixtures';

function findRow(id: string) {
  const row = unmappedActivityRows.find(candidate => candidate.id === id);
  if (!row) throw new Error(`Missing fixture ${id}`);
  return row;
}

describe('unmappedActivityRows', () => {
  it('holds seven unmapped contract calls with unique ids', () => {
    expect(unmappedActivityRows).toHaveLength(7);
    expect(new Set(unmappedActivityRows.map(row => row.id)).size).toBe(7);
  });

  it('includes pending and failed rows', () => {
    const statuses = unmappedActivityRows.map(row => row.status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('failed');
  });
});

describe('summarizeNetBalanceChange', () => {
  it('shows fiat for a single spend', () => {
    expect(summarizeNetBalanceChange(findRow('deposit-to-farm'))).toEqual({
      kind: 'amounts',
      primary: '−50 STX',
      secondary: '−$40.00',
    });
  });

  it('puts what was received above what was spent', () => {
    expect(summarizeNetBalanceChange(findRow('swap-x-for-y'))).toEqual({
      kind: 'amounts',
      primary: '+0.004155 sBTC',
      secondary: '−500 STX',
    });
  });

  it('lists two spends without fiat', () => {
    expect(summarizeNetBalanceChange(findRow('add-liquidity'))).toEqual({
      kind: 'amounts',
      primary: '−100 STX',
      secondary: '−0.0008 sBTC',
    });
  });

  it('shows a single receive on its own', () => {
    expect(summarizeNetBalanceChange(findRow('claim-airdrop'))).toEqual({
      kind: 'amounts',
      primary: '+1,000 USDh',
      secondary: undefined,
    });
  });

  it('counts three or more assets', () => {
    expect(summarizeNetBalanceChange(findRow('zap-in'))).toEqual({
      kind: 'count',
      label: '3 assets',
    });
  });

  it('keeps the current presentation for pending and failed rows', () => {
    expect(summarizeNetBalanceChange(findRow('execute-batch'))).toEqual({ kind: 'current' });
    expect(summarizeNetBalanceChange(findRow('withdraw-all'))).toEqual({ kind: 'current' });
  });

  it('shows nothing for a confirmed call without balance changes', () => {
    const row: UnmappedActivityRow = { ...findRow('deposit-to-farm'), balanceChanges: [] };
    expect(summarizeNetBalanceChange(row)).toEqual({ kind: 'none' });
  });

  it('ignores zero changes when counting', () => {
    const row: UnmappedActivityRow = {
      ...findRow('add-liquidity'),
      balanceChanges: [
        { asset: 'stx', amount: -1_000_000 },
        { asset: 'sbtc', amount: 0 },
        { asset: 'usdh', amount: 0 },
      ],
    };
    expect(summarizeNetBalanceChange(row)).toEqual({
      kind: 'amounts',
      primary: '−1 STX',
      secondary: '−$0.80',
    });
  });
});

describe('getContractName', () => {
  it('returns the contract name of a contract id', () => {
    expect(getContractName('SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.farm-v3')).toBe('farm-v3');
  });
});
