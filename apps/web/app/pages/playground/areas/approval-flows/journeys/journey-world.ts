export const journeyAssetIds = ['btc', 'stx', 'sbtc', 'usdh', 'zsbtc'] as const;

export type JourneyAssetId = (typeof journeyAssetIds)[number];

interface JourneyAsset {
  id: JourneyAssetId;
  symbol: string;
  name: string;
  decimals: number;
  usdPrice: number;
}

const journeyAssets: Record<JourneyAssetId, JourneyAsset> = {
  btc: { id: 'btc', symbol: 'BTC', name: 'Bitcoin', decimals: 8, usdPrice: 96_000 },
  stx: { id: 'stx', symbol: 'STX', name: 'Stacks', decimals: 6, usdPrice: 0.8 },
  sbtc: { id: 'sbtc', symbol: 'sBTC', name: 'sBTC', decimals: 8, usdPrice: 96_000 },
  usdh: { id: 'usdh', symbol: 'USDh', name: 'Hermetica USDh', decimals: 8, usdPrice: 1 },
  zsbtc: { id: 'zsbtc', symbol: 'zsBTC', name: 'Zest sBTC', decimals: 8, usdPrice: 96_000 },
};

export const journeyWalletKinds = ['software', 'ledger'] as const;

export type JourneyWalletKind = (typeof journeyWalletKinds)[number];

type JourneyAccountKind = JourneyWalletKind | 'vault';

export const journeyAccountIds = ['personal', 'bitcoin-vault', 'stacks-vault'] as const;

export type JourneyAccountId = (typeof journeyAccountIds)[number];

export interface JourneyAccount {
  id: JourneyAccountId;
  kind: JourneyAccountKind;
  name: string;
  bitcoinAddress?: string;
  stacksAddress?: string;
  signers?: string[];
  threshold?: number;
}

type JourneyBalances = Record<JourneyAssetId, number>;

export interface JourneyMovement {
  asset: JourneyAssetId;
  amount: number;
}

export interface JourneyFee {
  asset: JourneyAssetId;
  amount: number;
}

type JourneyOutcomeStatus = 'confirmed' | 'failed';

export interface JourneyOutcome {
  requestId: number;
  accountId: JourneyAccountId;
  feePayer: JourneyAccountId;
  title: string;
  status: JourneyOutcomeStatus;
  movements: JourneyMovement[];
  fee: JourneyFee | null;
}

export interface JourneyActivityEntry {
  key: string;
  accountId: JourneyAccountId;
  title: string;
  status: JourneyOutcomeStatus;
  movements: JourneyMovement[];
  fee: JourneyFee | null;
  isHistorical: boolean;
}

export interface JourneyWorld {
  wallet: JourneyWalletKind;
  accounts: JourneyAccount[];
  balances: Record<JourneyAccountId, JourneyBalances>;
  activity: JourneyActivityEntry[];
}

const vaultSigners = ['You', 'Co-signer A', 'Co-signer B'];

function emptyBalances(): JourneyBalances {
  return { btc: 0, stx: 0, sbtc: 0, usdh: 0, zsbtc: 0 };
}

function createAccounts(wallet: JourneyWalletKind): JourneyAccount[] {
  return [
    {
      id: 'personal',
      kind: wallet,
      name: wallet === 'ledger' ? 'Ledger Account 1' : 'Account 1',
      bitcoinAddress: 'bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el',
      stacksAddress: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
    },
    {
      id: 'bitcoin-vault',
      kind: 'vault',
      name: 'Treasury vault',
      bitcoinAddress: 'bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej',
      signers: vaultSigners,
      threshold: 2,
    },
    {
      id: 'stacks-vault',
      kind: 'vault',
      name: 'Operations vault',
      stacksAddress: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4',
      signers: vaultSigners,
      threshold: 2,
    },
  ];
}

function createHistory(): JourneyActivityEntry[] {
  return [
    {
      key: 'history-receive-btc',
      accountId: 'personal',
      title: 'Received Bitcoin',
      status: 'confirmed',
      movements: [{ asset: 'btc', amount: 1_250_000 }],
      fee: null,
      isHistorical: true,
    },
    {
      key: 'history-receive-stx',
      accountId: 'personal',
      title: 'Received Stacks',
      status: 'confirmed',
      movements: [{ asset: 'stx', amount: 2_400_000_000 }],
      fee: null,
      isHistorical: true,
    },
    {
      key: 'history-deposit-sbtc',
      accountId: 'personal',
      title: 'Deposited sBTC',
      status: 'confirmed',
      movements: [{ asset: 'sbtc', amount: 400_000 }],
      fee: null,
      isHistorical: true,
    },
    {
      key: 'history-fund-bitcoin-vault',
      accountId: 'bitcoin-vault',
      title: 'Received Bitcoin',
      status: 'confirmed',
      movements: [{ asset: 'btc', amount: 5_000_000 }],
      fee: null,
      isHistorical: true,
    },
    {
      key: 'history-fund-stacks-vault',
      accountId: 'stacks-vault',
      title: 'Received Stacks',
      status: 'confirmed',
      movements: [{ asset: 'stx', amount: 15_000_000_000 }],
      fee: null,
      isHistorical: true,
    },
  ];
}

function applyEntry(
  balances: Record<JourneyAccountId, JourneyBalances>,
  accountId: JourneyAccountId,
  movements: JourneyMovement[]
) {
  const next = { ...balances[accountId] };
  movements.forEach(movement => {
    next[movement.asset] += movement.amount;
  });
  return { ...balances, [accountId]: next };
}

function outcomeToEntry(outcome: JourneyOutcome): JourneyActivityEntry {
  return {
    key: `request-${outcome.requestId}`,
    accountId: outcome.accountId,
    title: outcome.title,
    status: outcome.status,
    movements: outcome.status === 'confirmed' ? outcome.movements : [],
    fee: outcome.fee,
    isHistorical: false,
  };
}

export function deriveJourneyWorld(
  wallet: JourneyWalletKind,
  outcomes: JourneyOutcome[]
): JourneyWorld {
  const history = createHistory();
  const initialBalances: Record<JourneyAccountId, JourneyBalances> = {
    personal: emptyBalances(),
    'bitcoin-vault': emptyBalances(),
    'stacks-vault': emptyBalances(),
  };
  const seeded = history.reduce(
    (balances, entry) => applyEntry(balances, entry.accountId, entry.movements),
    initialBalances
  );
  const balances = outcomes.reduce((current, outcome) => {
    const moved =
      outcome.status === 'confirmed'
        ? applyEntry(current, outcome.accountId, outcome.movements)
        : current;
    if (!outcome.fee) return moved;
    return applyEntry(moved, outcome.feePayer, [
      { asset: outcome.fee.asset, amount: -outcome.fee.amount },
    ]);
  }, seeded);
  const activity = [...outcomes.map(outcomeToEntry).reverse(), ...history.reverse()];

  return { wallet, accounts: createAccounts(wallet), balances, activity };
}

export function getJourneyAccount(world: JourneyWorld, accountId: JourneyAccountId) {
  return world.accounts.find(account => account.id === accountId);
}

function toDisplayAmount(asset: JourneyAssetId, amount: number) {
  return amount / 10 ** journeyAssets[asset].decimals;
}

export function toUsd(asset: JourneyAssetId, amount: number) {
  return toDisplayAmount(asset, amount) * journeyAssets[asset].usdPrice;
}

export function getAccountUsdValue(world: JourneyWorld, accountId: JourneyAccountId) {
  const balances = world.balances[accountId];
  return journeyAssetIds.reduce((total, asset) => total + toUsd(asset, balances[asset]), 0);
}

const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatUsd(value: number) {
  return usdFormatter.format(value);
}

export function formatAssetAmount(asset: JourneyAssetId, amount: number) {
  const value = toDisplayAmount(asset, Math.abs(amount));
  const formatted = value.toLocaleString('en-US', {
    maximumFractionDigits: journeyAssets[asset].decimals,
  });
  return `${formatted} ${journeyAssets[asset].symbol}`;
}

export function formatSignedAssetAmount(movement: JourneyMovement) {
  const sign = movement.amount < 0 ? '−' : '+';
  return `${sign}${formatAssetAmount(movement.asset, movement.amount)}`;
}
