import {
  type JourneyFee,
  type JourneyMovement,
  formatSignedAssetAmount,
  formatUsd,
  toUsd,
} from '../journeys/journey-world';

export type ActivityRowStatus = 'confirmed' | 'pending' | 'failed';

export interface UnmappedActivityRow {
  id: string;
  contractId: string;
  functionName: string;
  status: ActivityRowStatus;
  minutesAgo: number;
  balanceChanges: JourneyMovement[];
  fee: JourneyFee;
  txid: string;
}

export interface MappedActivityShape {
  id: string;
  title: string;
  subtitle: string;
  primary: string;
  secondary?: string;
  status: ActivityRowStatus;
}

export type ActivityTrailing =
  | { kind: 'current' }
  | { kind: 'none' }
  | { kind: 'count'; label: string }
  | { kind: 'amounts'; primary: string; secondary?: string };

const minimumAssetsForCount = 3;

export const unmappedActivityRows: UnmappedActivityRow[] = [
  {
    id: 'deposit-to-farm',
    contractId: 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.farm-v3',
    functionName: 'deposit-to-farm',
    status: 'confirmed',
    minutesAgo: 12,
    balanceChanges: [{ asset: 'stx', amount: -50_000_000 }],
    fee: { asset: 'stx', amount: 12_000 },
    txid: '0x8c1f2a7d55e0a1a36f0d9f0b1e7c2b4b3b9a5c6d7e8f90a1b2c3d4e5f6a7b8c9',
  },
  {
    id: 'swap-x-for-y',
    contractId: 'SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.stableswap-stx-ststx-v-1-2',
    functionName: 'swap-x-for-y',
    status: 'confirmed',
    minutesAgo: 48,
    balanceChanges: [
      { asset: 'stx', amount: -500_000_000 },
      { asset: 'sbtc', amount: 415_500 },
    ],
    fee: { asset: 'stx', amount: 12_000 },
    txid: '0x1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e',
  },
  {
    id: 'add-liquidity',
    contractId: 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.pool-v2',
    functionName: 'add-liquidity',
    status: 'confirmed',
    minutesAgo: 95,
    balanceChanges: [
      { asset: 'stx', amount: -100_000_000 },
      { asset: 'sbtc', amount: -80_000 },
    ],
    fee: { asset: 'stx', amount: 12_000 },
    txid: '0x2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f',
  },
  {
    id: 'claim-airdrop',
    contractId: 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.airdrop-v1',
    functionName: 'claim-airdrop',
    status: 'confirmed',
    minutesAgo: 180,
    balanceChanges: [{ asset: 'usdh', amount: 100_000_000_000 }],
    fee: { asset: 'stx', amount: 12_000 },
    txid: '0x3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a',
  },
  {
    id: 'zap-in',
    contractId: 'SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.zap-v1',
    functionName: 'zap-in',
    status: 'confirmed',
    minutesAgo: 600,
    balanceChanges: [
      { asset: 'stx', amount: -20_000_000 },
      { asset: 'sbtc', amount: -10_000 },
      { asset: 'zsbtc', amount: 26_400 },
    ],
    fee: { asset: 'stx', amount: 12_000 },
    txid: '0x4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b',
  },
  {
    id: 'execute-batch',
    contractId: 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.batcher-v1',
    functionName: 'execute-batch',
    status: 'pending',
    minutesAgo: 2,
    balanceChanges: [{ asset: 'stx', amount: -5_000_000 }],
    fee: { asset: 'stx', amount: 12_000 },
    txid: '0x5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c',
  },
  {
    id: 'withdraw-all',
    contractId: 'SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1.farm-v3',
    functionName: 'withdraw-all',
    status: 'failed',
    minutesAgo: 1_440,
    balanceChanges: [],
    fee: { asset: 'stx', amount: 12_000 },
    txid: '0x6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d',
  },
];

export const mappedActivityShapes: MappedActivityShape[] = [
  {
    id: 'mapped-send',
    title: 'Sent',
    subtitle: 'To SP3F…SVTE',
    primary: '−250 STX',
    secondary: '−$200.00',
    status: 'confirmed',
  },
  {
    id: 'mapped-swap',
    title: 'Swapped',
    subtitle: 'STX → sBTC on Bitflow',
    primary: '+0.004155 sBTC',
    secondary: '−500 STX',
    status: 'confirmed',
  },
  {
    id: 'mapped-supply',
    title: 'Supplied',
    subtitle: 'sBTC to Zest',
    primary: '−0.0015 sBTC',
    secondary: '−$144.00',
    status: 'confirmed',
  },
  {
    id: 'mapped-pending',
    title: 'Sending',
    subtitle: 'To bc1q…0wlh',
    primary: '−0.002 BTC',
    status: 'pending',
  },
];

export function getContractName(contractId: string) {
  return contractId.split('.')[1] ?? contractId;
}

export function summarizeNetBalanceChange(row: UnmappedActivityRow): ActivityTrailing {
  if (row.status !== 'confirmed') return { kind: 'current' };
  const changes = row.balanceChanges.filter(change => change.amount !== 0);
  if (changes.length === 0) return { kind: 'none' };
  if (changes.length >= minimumAssetsForCount) {
    return { kind: 'count', label: `${changes.length} assets` };
  }
  const received = changes.filter(change => change.amount > 0);
  const spent = changes.filter(change => change.amount < 0);
  const [onlySpend] = spent;
  if (onlySpend && spent.length === 1 && received.length === 0) {
    return {
      kind: 'amounts',
      primary: formatSignedAssetAmount(onlySpend),
      secondary: `−${formatUsd(Math.abs(toUsd(onlySpend.asset, onlySpend.amount)))}`,
    };
  }
  const [first, second] = [...received, ...spent];
  if (!first) return { kind: 'none' };
  return {
    kind: 'amounts',
    primary: formatSignedAssetAmount(first),
    secondary: second ? formatSignedAssetAmount(second) : undefined,
  };
}
