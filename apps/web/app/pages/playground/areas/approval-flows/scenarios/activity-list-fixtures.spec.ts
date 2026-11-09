import { describe, expect, test } from 'vitest';

import {
  currentActivityPresentation,
  mappedActivityRows,
  proposedActivityPresentation,
  summarizeBalanceChange,
  unmappedActivityRows,
} from './activity-list-fixtures';
import { assetAmount } from './approval-assets';

function row(id: string) {
  const found = [...unmappedActivityRows, ...mappedActivityRows].find(entry => entry.id === id);
  if (!found) throw new Error(`Missing fixture ${id}`);
  return found;
}

describe('summarizeBalanceChange', () => {
  test('shows fiat for a single spend', () => {
    expect(summarizeBalanceChange([assetAmount('STX', -60)])).toEqual({
      primary: '−60 STX',
      secondary: '−$96.00',
      tone: 'negative',
    });
  });

  test('puts received above spent', () => {
    expect(summarizeBalanceChange([assetAmount('sBTC', -0.001), assetAmount('STX', 42.1)])).toEqual(
      { primary: '+42.1 STX', secondary: '−0.001 sBTC', tone: 'positive' }
    );
  });

  test('counts three or more assets', () => {
    expect(
      summarizeBalanceChange([
        assetAmount('STX', -80),
        assetAmount('sBTC', -0.0005),
        assetAmount('aeUSDC', 160),
      ])
    ).toEqual({ primary: '3 assets', secondary: '1 received · 2 spent', tone: 'neutral' });
  });

  test('nets the same asset and ignores zero changes', () => {
    expect(summarizeBalanceChange([assetAmount('STX', 5), assetAmount('STX', -5)])).toBeNull();
    expect(summarizeBalanceChange([])).toBeNull();
  });
});

describe('activity rows', () => {
  test('has seven unmapped contract-call rows', () => {
    expect(unmappedActivityRows).toHaveLength(7);
    expect(unmappedActivityRows.every(entry => !entry.mapped && entry.contract)).toBe(true);
  });

  test('confirmed unmapped rows keep the contract and function and summarize the change', () => {
    const presentation = proposedActivityPresentation(row('swap'));
    expect(presentation.title).toBe('swap-x-for-y');
    expect(presentation.caption).toBe('xyk-core-v-1-2');
    expect(presentation.trailing?.primary).toBe('+42.1 STX');
    expect(currentActivityPresentation(row('swap')).trailing?.primary).toBe('Contract call');
  });

  test('a confirmed call that moved nothing has no trailing summary', () => {
    expect(proposedActivityPresentation(row('vote')).trailing).toBeNull();
  });

  test('pending and failed rows keep the current presentation', () => {
    for (const id of ['pending-supply', 'failed-register']) {
      expect(proposedActivityPresentation(row(id))).toEqual(currentActivityPresentation(row(id)));
    }
  });

  test('mapped rows are unchanged', () => {
    for (const entry of mappedActivityRows) {
      expect(proposedActivityPresentation(entry)).toEqual(currentActivityPresentation(entry));
    }
  });
});
