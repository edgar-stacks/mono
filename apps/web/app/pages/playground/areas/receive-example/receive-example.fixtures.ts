export interface ReceiveFixtureAsset {
  id: 'btc' | 'stx';
  name: string;
  network: string;
  address: string;
}

export const receiveFixtureAssets: ReceiveFixtureAsset[] = [
  {
    id: 'btc',
    name: 'Bitcoin',
    network: 'Native SegWit',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  },
  {
    id: 'stx',
    name: 'Stacks',
    network: 'Stacks mainnet',
    address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
  },
];
