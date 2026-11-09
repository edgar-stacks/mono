import { describe, expect, test } from 'vitest';

import { makeAccountIdentifer } from '@leather.io/crypto';
import type { AccountId } from '@leather.io/models';

import type { WalletType } from '@app/store/common/wallet-type.selectors';
import type { PolicyStore } from '@app/store/policy/policy-store.utils';

import {
  buildWalletRows,
  canHideAccount,
  filterWalletTreeToBitcoinAccounts,
} from './switch-account-sheet.utils';

const fingerprint = 'a1b2c3d4';
function account(accountIndex: number): AccountId {
  return { fingerprint, accountIndex };
}
function idOf(acc: AccountId) {
  return makeAccountIdentifer(acc.fingerprint, acc.accountIndex);
}
function walletGroup(type: WalletType, accountCount: number) {
  return {
    type,
    accounts: Array.from({ length: accountCount }, (_, accountIndex) => account(accountIndex)),
  };
}
function policyOf(parent: AccountId, address: string): PolicyStore {
  const parentAccountId = idOf(parent);
  const networkId = 'mainnet';
  return {
    id: `${parentAccountId}/${address}/${networkId}`,
    parentAccountId,
    networkId,
    chain: 'stacks',
    address,
    publicKeys: ['03aa', '02bb'],
    threshold: 2,
    role: 'signer',
  };
}

function noPolicies(): PolicyStore[] {
  return [];
}

describe(buildWalletRows.name, () => {
  test('software wallets append an add-account row', () => {
    const rows = buildWalletRows(walletGroup('software', 3), noPolicies);
    expect(rows.map(row => row.kind)).toEqual(['account', 'account', 'account', 'addAccount']);
  });

  test('ledger wallets have no add-account row', () => {
    const rows = buildWalletRows(walletGroup('ledger', 3), noPolicies);
    expect(rows.map(row => row.kind)).toEqual(['account', 'account', 'account']);
  });

  test('nests policies directly beneath their parent account', () => {
    const policy = policyOf(account(0), 'SM3CFXKD81GREH6MYFW4P9VKSSR2N525W3KDRH3P1');
    const rows = buildWalletRows(walletGroup('ledger', 2), acc =>
      acc.accountIndex === 0 ? [policy] : []
    );
    expect(rows.map(row => row.kind)).toEqual(['account', 'policy', 'account']);
  });
});

describe(filterWalletTreeToBitcoinAccounts.name, () => {
  const ledgerFingerprint = 'e5f6a7b8';
  function ledgerWallet(accountCount: number): {
    fingerprint: string;
    type: WalletType;
    accounts: AccountId[];
  } {
    return {
      fingerprint: ledgerFingerprint,
      type: 'ledger',
      accounts: Array.from({ length: accountCount }, (_, accountIndex) => ({
        fingerprint: ledgerFingerprint,
        accountIndex,
      })),
    };
  }

  test('software wallets keep every account', () => {
    const software = { fingerprint, ...walletGroup('software', 3) };

    expect(filterWalletTreeToBitcoinAccounts([software], [])).toEqual([software]);
  });

  test('ledger wallets keep only accounts with a bitcoin keychain', () => {
    const filtered = filterWalletTreeToBitcoinAccounts(
      [ledgerWallet(3)],
      [makeAccountIdentifer(ledgerFingerprint, 1), makeAccountIdentifer(fingerprint, 0)]
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].accounts).toEqual([{ fingerprint: ledgerFingerprint, accountIndex: 1 }]);
  });

  test('drops ledger wallets left without accounts', () => {
    const software = { fingerprint, ...walletGroup('software', 1) };

    const filtered = filterWalletTreeToBitcoinAccounts(
      [software, ledgerWallet(2)],
      [makeAccountIdentifer(fingerprint, 0)]
    );

    expect(filtered).toEqual([software]);
  });
});

describe(canHideAccount.name, () => {
  test('cannot hide the active account', () => {
    const walletAccounts = [account(0), account(1)];

    expect(
      canHideAccount({
        account: account(0),
        activeAccount: account(0),
        walletAccounts,
        hiddenAccountIds: [],
      })
    ).toBe(false);
  });

  test('cannot hide a wallet last visible account', () => {
    const walletAccounts = [account(0), account(1)];
    const activeAccountInAnotherWallet: AccountId = { fingerprint: 'e5f6a7b8', accountIndex: 0 };

    expect(
      canHideAccount({
        account: account(1),
        activeAccount: activeAccountInAnotherWallet,
        walletAccounts,
        hiddenAccountIds: [idOf(account(0))],
      })
    ).toBe(false);
  });

  test('can hide a non-active account when other visible accounts remain', () => {
    const walletAccounts = [account(0), account(1), account(2)];

    expect(
      canHideAccount({
        account: account(1),
        activeAccount: account(0),
        walletAccounts,
        hiddenAccountIds: [],
      })
    ).toBe(true);
  });
});
