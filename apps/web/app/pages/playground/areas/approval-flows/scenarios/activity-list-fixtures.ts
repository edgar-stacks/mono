import {
  type AssetAmount,
  type DemoAssetSymbol,
  amount,
  fiatValue,
  formatAssetAmount,
  formatFiat,
} from './approval-assets';

export type ActivityRowStatus = 'confirmed' | 'pending' | 'failed';

export interface ContractCallActivity {
  id: string;
  appName: string;
  contractId: string;
  functionName: string;
  status: ActivityRowStatus;
  minutesAgo: number;
  changes: AssetAmount[];
  fee: AssetAmount;
}

export interface MappedActivity {
  id: string;
  shape: 'send' | 'receive' | 'swap';
  title: string;
  subtitle: string;
  status: ActivityRowStatus;
  minutesAgo: number;
  changes: AssetAmount[];
  fee?: AssetAmount;
}

export interface ActivityTrailing {
  primary: string;
  secondary?: string;
  tone: 'received' | 'spent';
}

function spend(symbol: DemoAssetSymbol, decimalAmount: number) {
  const value = amount(symbol, decimalAmount);
  return { ...value, amount: -value.amount };
}

export const unmappedContractCalls: ContractCallActivity[] = [
  {
    id: 'zest-borrow',
    appName: 'Zest',
    contractId: 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.pool-borrow-v2-1',
    functionName: 'borrow',
    status: 'confirmed',
    minutesAgo: 12,
    changes: [amount('aeUSDC', 500)],
    fee: amount('STX', 0.0045),
  },
  {
    id: 'router-swap',
    appName: 'ALEX',
    contractId: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.amm-router-v3',
    functionName: 'swap-helper',
    status: 'confirmed',
    minutesAgo: 48,
    changes: [spend('STX', 250), amount('ALEX', 38_500)],
    fee: amount('STX', 0.0045),
  },
  {
    id: 'add-liquidity',
    appName: 'Bitflow',
    contractId: 'SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.stableswap-core-v-1-2',
    functionName: 'add-liquidity',
    status: 'confirmed',
    minutesAgo: 95,
    changes: [spend('aeUSDC', 200), spend('USDh', 200), amount('ALEX', 1_200)],
    fee: amount('STX', 0.0045),
  },
  {
    id: 'mint',
    appName: 'Gamma',
    contractId: 'SP3QSAJQ4EA8WXEDSRRKMZZ29NH91VZ6C5X88FGZQ.stacks-punks-mint',
    functionName: 'claim',
    status: 'confirmed',
    minutesAgo: 180,
    changes: [spend('STX', 25)],
    fee: amount('STX', 0.0045),
  },
  {
    id: 'vote',
    appName: 'Stacks DAO Hub',
    contractId: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.dao-proposal-voting',
    functionName: 'vote',
    status: 'confirmed',
    minutesAgo: 320,
    changes: [],
    fee: amount('STX', 0.0045),
  },
  {
    id: 'claim-pending',
    appName: 'Leather staking',
    contractId: 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.sbtc-rewards-v1',
    functionName: 'claim-rewards',
    status: 'pending',
    minutesAgo: 2,
    changes: [amount('sBTC', 0.00041)],
    fee: amount('STX', 0.0045),
  },
  {
    id: 'route-failed',
    appName: 'ALEX',
    contractId: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.amm-router-v3',
    functionName: 'execute-route',
    status: 'failed',
    minutesAgo: 610,
    changes: [],
    fee: amount('STX', 0.0045),
  },
];

export const mappedActivities: MappedActivity[] = [
  {
    id: 'mapped-send',
    shape: 'send',
    title: 'STX',
    subtitle: 'Sent to SP1H1…4C7R',
    status: 'confirmed',
    minutesAgo: 30,
    changes: [spend('STX', 75)],
    fee: amount('STX', 0.0045),
  },
  {
    id: 'mapped-receive',
    shape: 'receive',
    title: 'sBTC',
    subtitle: 'Received from SP3TB…P2H',
    status: 'confirmed',
    minutesAgo: 65,
    changes: [amount('sBTC', 0.005)],
  },
  {
    id: 'mapped-swap',
    shape: 'swap',
    title: 'STX → sBTC',
    subtitle: 'Swapped on Bitflow',
    status: 'confirmed',
    minutesAgo: 140,
    changes: [spend('STX', 1500), amount('sBTC', 0.00961)],
    fee: amount('STX', 0.0045),
  },
];

const countThreshold = 3;

export function netBalanceChanges(changes: AssetAmount[]) {
  const totals = new Map<DemoAssetSymbol, number>();
  changes.forEach(change =>
    totals.set(change.symbol, (totals.get(change.symbol) ?? 0) + change.amount)
  );
  return [...totals.entries()]
    .map(([symbol, total]) => ({ symbol, amount: total }))
    .filter(change => change.amount !== 0);
}

export function summarizeActivityTrailing(
  status: ActivityRowStatus,
  changes: AssetAmount[]
): ActivityTrailing | null {
  if (status !== 'confirmed') return null;
  const net = netBalanceChanges(changes);
  if (net.length === 0) return null;

  const received = net.filter(change => change.amount > 0);
  const spent = net.filter(change => change.amount < 0);
  const netFiat = net.reduce((total, change) => total + fiatValue(change), 0);

  if (net.length >= countThreshold) {
    return {
      primary: `${net.length} assets`,
      secondary: formatFiat(netFiat, { signed: true }),
      tone: netFiat >= 0 ? 'received' : 'spent',
    };
  }

  const [first, second] = [...received, ...spent];
  if (!second) {
    if (first.amount < 0) {
      return {
        primary: formatAssetAmount(first, { signed: true }),
        secondary: formatFiat(fiatValue(first), { signed: true }),
        tone: 'spent',
      };
    }
    return { primary: formatAssetAmount(first, { signed: true }), tone: 'received' };
  }

  return {
    primary: formatAssetAmount(first, { signed: true }),
    secondary: formatAssetAmount(second, { signed: true }),
    tone: first.amount > 0 ? 'received' : 'spent',
  };
}
