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

describe(filterWalletTreeToBitcoinAccounts.name, () => {
  const ledgerFingerprint = 'e5f6a7b8';
  function ledgerAccount(accountIndex: number): AccountId {
    return { fingerprint: ledgerFingerprint, accountIndex };
  }
  const softwareWallet = walletGroup('software', 3);
  const ledgerWallet: { type: WalletType; accounts: AccountId[] } = {
    type: 'ledger',
    accounts: [ledgerAccount(0), ledgerAccount(1), ledgerAccount(2)],
  };

  test('keeps every software wallet account', () => {
    expect(filterWalletTreeToBitcoinAccounts([softwareWallet], [])).toEqual([softwareWallet]);
  });

  test('keeps only ledger accounts that have a bitcoin keychain', () => {
    const [wallet] = filterWalletTreeToBitcoinAccounts(
      [ledgerWallet],
      [idOf(ledgerAccount(0)), idOf(ledgerAccount(2))]
    );
    expect(wallet.accounts).toEqual([ledgerAccount(0), ledgerAccount(2)]);
  });

  test('drops ledger wallets left without accounts', () => {
    expect(filterWalletTreeToBitcoinAccounts([softwareWallet, ledgerWallet], [])).toEqual([
      softwareWallet,
    ]);
  });

  test('ignores bitcoin keychains of another wallet', () => {
    expect(filterWalletTreeToBitcoinAccounts([ledgerWallet], [idOf(account(0))])).toEqual([]);
  });

  test('keeps the other wallet fields', () => {
    const namedLedgerWallet = { ...ledgerWallet, name: 'Ledger', fingerprint: ledgerFingerprint };
    const [wallet] = filterWalletTreeToBitcoinAccounts(
      [namedLedgerWallet],
      [idOf(ledgerAccount(1))]
    );
    expect(wallet).toEqual({ ...namedLedgerWallet, accounts: [ledgerAccount(1)] });
  });
});
