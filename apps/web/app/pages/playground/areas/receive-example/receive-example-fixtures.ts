export interface ReceiveExampleAsset {
  id: 'btc' | 'stx';
  name: string;
  symbol: string;
  network: string;
  address: string;
  balance: string;
  fiatBalance: string;
}

export const receiveExampleAssets: ReceiveExampleAsset[] = [
  {
    id: 'btc',
    name: 'Bitcoin',
    symbol: 'BTC',
    network: 'Bitcoin',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    balance: '0.04821',
    fiatBalance: '$4,821.00',
  },
  {
    id: 'stx',
    name: 'Stacks',
    symbol: 'STX',
    network: 'Stacks',
    address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
    balance: '1,250.00',
    fiatBalance: '$2,125.00',
  },
];
