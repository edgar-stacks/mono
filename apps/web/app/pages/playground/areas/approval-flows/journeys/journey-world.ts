import {
  type AssetAmount,
  type DemoAssetSymbol,
  amount,
  demoAssetSymbols,
  fiatValue,
} from '../scenarios/approval-assets';
import type { ApprovalRequest, SignerKind } from '../scenarios/approval-model';
import { accountAddress, counterparties } from '../scenarios/scenario-fixtures';

type Portfolio = Partial<Record<DemoAssetSymbol, number>>;

interface JourneyPortfolios {
  account: Portfolio;
  vault: Portfolio;
}

interface JourneyWorld {
  wallet: SignerKind;
  accountName: string;
  addresses: { bitcoin: string; stacks: string };
  vault: { name: string; addresses: { bitcoin: string; stacks: string } };
  referenceDate: string;
  portfolios: JourneyPortfolios;
}

export const walletShapes: { id: SignerKind; label: string }[] = [
  { id: 'software', label: 'Software account' },
  { id: 'ledger', label: 'Ledger account' },
];

export function parseWalletShape(value: string | null | undefined): SignerKind {
  return value === 'ledger' ? 'ledger' : 'software';
}

const referenceDate = '2026-11-01';

function toPortfolio(values: AssetAmount[]): Portfolio {
  return Object.fromEntries(values.map(value => [value.symbol, value.amount]));
}

const startingAccount = toPortfolio([
  amount('BTC', 0.3412),
  amount('STX', 18_250),
  amount('sBTC', 0.0731),
  amount('aeUSDC', 1_240),
  amount('ALEX', 52_000),
  amount('zsBTC', 0.02),
]);

const startingVault = toPortfolio([amount('BTC', 1.85), amount('STX', 120_000)]);

export function createJourneyWorld(wallet: SignerKind): JourneyWorld {
  return {
    wallet,
    accountName: wallet === 'ledger' ? 'Ledger account' : 'Account 1',
    addresses: {
      bitcoin: accountAddress(wallet, 'bitcoin'),
      stacks: accountAddress(wallet, 'stacks'),
    },
    vault: {
      name: 'Team Treasury',
      addresses: { bitcoin: counterparties.vaultBitcoin, stacks: counterparties.vaultStacks },
    },
    referenceDate,
    portfolios: { account: { ...startingAccount }, vault: { ...startingVault } },
  };
}

export function applyBalanceChanges(portfolio: Portfolio, changes: AssetAmount[]): Portfolio {
  return changes.reduce<Portfolio>(
    (next, change) => ({
      ...next,
      [change.symbol]: (next[change.symbol] ?? 0) + change.amount,
    }),
    { ...portfolio }
  );
}

function negate(value: AssetAmount): AssetAmount {
  return { ...value, amount: -value.amount };
}

export function movementChanges(request: ApprovalRequest): AssetAmount[] {
  return request.movements.map(movement =>
    movement.direction === 'out' ? negate(movement.value) : movement.value
  );
}

export function feeChanges(request: ApprovalRequest): AssetAmount[] {
  return request.fee ? [negate(request.fee.value)] : [];
}

type SettlementOutcome = 'confirmed' | 'failed-on-chain';

export function settleRequest(
  portfolios: JourneyPortfolios,
  request: ApprovalRequest,
  outcome: SettlementOutcome
): JourneyPortfolios {
  const changes =
    outcome === 'confirmed'
      ? [...movementChanges(request), ...feeChanges(request)]
      : feeChanges(request);
  if (request.vault) {
    return { ...portfolios, vault: applyBalanceChanges(portfolios.vault, changes) };
  }
  return { ...portfolios, account: applyBalanceChanges(portfolios.account, changes) };
}

export function portfolioEntries(portfolio: Portfolio) {
  return demoAssetSymbols.flatMap(symbol => {
    const value = portfolio[symbol];
    return value === undefined ? [] : [{ symbol, amount: value }];
  });
}

export function portfolioUsdValue(portfolio: Portfolio) {
  return portfolioEntries(portfolio).reduce((total, entry) => total + fiatValue(entry), 0);
}
