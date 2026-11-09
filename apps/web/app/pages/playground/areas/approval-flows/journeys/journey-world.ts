import {
  type ApprovalAssetSymbol,
  type AssetAmount,
  approvalAssetSymbols,
  assetAmount,
  toUsd,
} from '../scenarios/approval-assets';
import { exampleAddresses } from '../scenarios/approval-fixtures';
import type {
  ApprovalAccount,
  ApprovalAccounts,
  ApprovalMovement,
  ApprovalWalletKind,
} from '../scenarios/approval-scenario.types';

type Balances = Record<ApprovalAssetSymbol, number>;

export interface WorldAccount extends ApprovalAccount {
  balances: Balances;
}

export interface WorldTransaction {
  accountId: string;
  status: 'pending' | 'confirmed' | 'failed';
  movements: ApprovalMovement[];
  fee: AssetAmount | null;
  feeCharged: boolean;
}

function balances(units: Balances): Balances {
  return {
    BTC: assetAmount('BTC', units.BTC).baseUnits,
    STX: assetAmount('STX', units.STX).baseUnits,
    sBTC: assetAmount('sBTC', units.sBTC).baseUnits,
    aeUSDC: assetAmount('aeUSDC', units.aeUSDC).baseUnits,
  };
}

const personalAccounts: Record<ApprovalWalletKind, WorldAccount> = {
  software: {
    id: 'account-1',
    label: 'Account 1',
    kind: 'software',
    addresses: { bitcoin: exampleAddresses.bitcoin, stacks: exampleAddresses.stacks },
    balances: balances({ BTC: 0.0842, STX: 18_250, sBTC: 0.0315, aeUSDC: 640 }),
  },
  ledger: {
    id: 'ledger-1',
    label: 'Ledger account',
    kind: 'ledger',
    addresses: { bitcoin: exampleAddresses.bitcoin, stacks: exampleAddresses.stacks },
    balances: balances({ BTC: 0.0842, STX: 18_250, sBTC: 0.0315, aeUSDC: 640 }),
  },
};

const vaultAccounts = {
  bitcoinVault: {
    id: 'vault-btc',
    label: 'Bitcoin treasury vault',
    kind: 'vault',
    addresses: { bitcoin: exampleAddresses.bitcoinVault },
    balances: balances({ BTC: 1.24, STX: 0, sBTC: 0, aeUSDC: 0 }),
  },
  stacksVault: {
    id: 'vault-stx',
    label: 'Stacks treasury vault',
    kind: 'vault',
    addresses: { stacks: exampleAddresses.stacksVault },
    balances: balances({ BTC: 0, STX: 86_400, sBTC: 0, aeUSDC: 0 }),
  },
} satisfies Record<string, WorldAccount>;

export function createJourneyWorld(wallet: ApprovalWalletKind): WorldAccount[] {
  return [personalAccounts[wallet], vaultAccounts.bitcoinVault, vaultAccounts.stacksVault];
}

function toApprovalAccount({ id, label, kind, addresses }: WorldAccount): ApprovalAccount {
  return { id, label, kind, addresses };
}

export function journeyAccounts(wallet: ApprovalWalletKind): ApprovalAccounts {
  return {
    personal: toApprovalAccount(personalAccounts[wallet]),
    bitcoinVault: toApprovalAccount(vaultAccounts.bitcoinVault),
    stacksVault: toApprovalAccount(vaultAccounts.stacksVault),
  };
}

function applyAmount(account: WorldAccount, amount: AssetAmount, sign: 1 | -1): WorldAccount {
  return {
    ...account,
    balances: {
      ...account.balances,
      [amount.asset]: account.balances[amount.asset] + sign * amount.baseUnits,
    },
  };
}

function applyTransaction(account: WorldAccount, transaction: WorldTransaction) {
  if (transaction.accountId !== account.id) return account;
  const movementsApply = transaction.status === 'confirmed';
  const afterMovements = movementsApply
    ? transaction.movements.reduce(
        (current, movement) =>
          applyAmount(current, movement.amount, movement.direction === 'in' ? 1 : -1),
        account
      )
    : account;
  if (transaction.fee && transaction.feeCharged) {
    return applyAmount(afterMovements, transaction.fee, -1);
  }
  return afterMovements;
}

export function applyWorldTransactions(
  world: WorldAccount[],
  transactions: WorldTransaction[]
): WorldAccount[] {
  return world.map(account => transactions.reduce(applyTransaction, account));
}

export function accountUsdValue(account: WorldAccount) {
  return approvalAssetSymbols.reduce(
    (total, asset) => total + toUsd({ asset, baseUnits: account.balances[asset] }),
    0
  );
}
