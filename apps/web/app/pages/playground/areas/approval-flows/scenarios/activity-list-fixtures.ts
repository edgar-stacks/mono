import {
  type ApprovalAssetSymbol,
  type AssetAmount,
  assetAmount,
  formatAssetAmount,
  formatUsd,
  toUsd,
} from './approval-assets';
import { exampleContracts } from './approval-fixtures';

export type ActivityStatus = 'pending' | 'confirmed' | 'failed';

export interface ActivityFixture {
  id: string;
  status: ActivityStatus;
  mapped: boolean;
  title: string;
  caption: string;
  contract?: string;
  functionName?: string;
  changes: AssetAmount[];
  fee: AssetAmount;
  time: string;
}

interface ActivityTrailing {
  primary: string;
  secondary?: string;
  tone: 'positive' | 'negative' | 'neutral';
}

export interface ActivityPresentation {
  title: string;
  caption: string;
  trailing: ActivityTrailing | null;
}

const minimumAssetCountForSummary = 3;

function contractName(contract: string) {
  return contract.split('.')[1] ?? contract;
}

function netChanges(changes: AssetAmount[]) {
  const totals = new Map<ApprovalAssetSymbol, number>();
  for (const change of changes) {
    totals.set(change.asset, (totals.get(change.asset) ?? 0) + change.baseUnits);
  }
  return [...totals.entries()]
    .map(([asset, baseUnits]) => ({ asset, baseUnits }))
    .filter(change => change.baseUnits !== 0);
}

export function summarizeBalanceChange(changes: AssetAmount[]): ActivityTrailing | null {
  const net = netChanges(changes);
  const received = net.filter(change => change.baseUnits > 0);
  const spent = net.filter(change => change.baseUnits < 0);

  if (net.length === 0) return null;

  if (net.length >= minimumAssetCountForSummary) {
    return {
      primary: `${net.length} assets`,
      secondary: `${received.length} received · ${spent.length} spent`,
      tone: 'neutral',
    };
  }

  if (net.length === 1) {
    const [change] = net;
    return {
      primary: formatAssetAmount(change, { signed: true }),
      secondary: formatUsd(toUsd(change), { signed: true }),
      tone: change.baseUnits > 0 ? 'positive' : 'negative',
    };
  }

  const [primary, secondary] = [...received, ...spent];
  return {
    primary: formatAssetAmount(primary, { signed: true }),
    secondary: formatAssetAmount(secondary, { signed: true }),
    tone: received.length > 0 ? 'positive' : 'negative',
  };
}

function statusTrailing(status: ActivityStatus): ActivityTrailing | null {
  if (status === 'pending') return { primary: 'Pending', tone: 'neutral' };
  if (status === 'failed') return { primary: 'Failed', tone: 'negative' };
  return null;
}

export function currentActivityPresentation(row: ActivityFixture): ActivityPresentation {
  if (row.mapped || !row.contract || !row.functionName) {
    return {
      title: row.title,
      caption: row.caption,
      trailing: statusTrailing(row.status) ?? summarizeBalanceChange(row.changes),
    };
  }
  return {
    title: row.functionName,
    caption: contractName(row.contract),
    trailing: statusTrailing(row.status) ?? { primary: 'Contract call', tone: 'neutral' },
  };
}

export function proposedActivityPresentation(row: ActivityFixture): ActivityPresentation {
  const current = currentActivityPresentation(row);
  if (row.mapped || row.status !== 'confirmed') return current;
  return { ...current, trailing: summarizeBalanceChange(row.changes) };
}

function spend(asset: ApprovalAssetSymbol, units: number) {
  return assetAmount(asset, -units);
}

const stacksFee = assetAmount('STX', 0.01);

export const unmappedActivityRows: ActivityFixture[] = [
  {
    id: 'mint',
    status: 'confirmed',
    mapped: false,
    title: 'claim-two',
    caption: 'mint-collection',
    contract: exampleContracts.nft,
    functionName: 'claim-two',
    changes: [spend('STX', 60)],
    fee: stacksFee,
    time: '09:42',
  },
  {
    id: 'swap',
    status: 'confirmed',
    mapped: false,
    title: 'swap-x-for-y',
    caption: 'xyk-core-v-1-2',
    contract: exampleContracts.bitflow,
    functionName: 'swap-x-for-y',
    changes: [spend('sBTC', 0.001), assetAmount('STX', 42.1)],
    fee: stacksFee,
    time: '09:15',
  },
  {
    id: 'rebalance',
    status: 'confirmed',
    mapped: false,
    title: 'rebalance-many',
    caption: 'vault-router',
    contract: exampleContracts.unknown,
    functionName: 'rebalance-many',
    changes: [spend('STX', 80), spend('sBTC', 0.0005), assetAmount('aeUSDC', 160)],
    fee: stacksFee,
    time: 'Yesterday',
  },
  {
    id: 'vote',
    status: 'confirmed',
    mapped: false,
    title: 'vote',
    caption: 'dao-proposal-voting',
    contract: exampleContracts.dao,
    functionName: 'vote',
    changes: [],
    fee: stacksFee,
    time: 'Yesterday',
  },
  {
    id: 'withdraw',
    status: 'confirmed',
    mapped: false,
    title: 'withdraw',
    caption: 'pool-borrow-v2-0',
    contract: exampleContracts.zest,
    functionName: 'withdraw',
    changes: [assetAmount('sBTC', 0.0201)],
    fee: stacksFee,
    time: 'Nov 6',
  },
  {
    id: 'pending-supply',
    status: 'pending',
    mapped: false,
    title: 'supply',
    caption: 'pool-borrow-v2-0',
    contract: exampleContracts.zest,
    functionName: 'supply',
    changes: [spend('sBTC', 0.02)],
    fee: stacksFee,
    time: 'Now',
  },
  {
    id: 'failed-register',
    status: 'failed',
    mapped: false,
    title: 'name-claim-fast',
    caption: 'BNS-V2',
    contract: exampleContracts.bns,
    functionName: 'name-claim-fast',
    changes: [],
    fee: stacksFee,
    time: 'Nov 5',
  },
];

export const mappedActivityRows: ActivityFixture[] = [
  {
    id: 'sent',
    status: 'confirmed',
    mapped: true,
    title: 'Sent',
    caption: 'To SP3F…SVTE',
    changes: [spend('STX', 250)],
    fee: stacksFee,
    time: '08:30',
  },
  {
    id: 'received',
    status: 'confirmed',
    mapped: true,
    title: 'Received',
    caption: 'From bc1q…5mdq',
    changes: [assetAmount('BTC', 0.004)],
    fee: assetAmount('BTC', 0),
    time: 'Yesterday',
  },
  {
    id: 'swapped',
    status: 'confirmed',
    mapped: true,
    title: 'Swapped',
    caption: 'STX → sBTC',
    changes: [spend('STX', 400), assetAmount('sBTC', 0.0094)],
    fee: stacksFee,
    time: 'Nov 4',
  },
];
