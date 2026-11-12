import { stakingPaths } from '~/pages/bitcoin-staking/bitcoin-staking.constants';

export interface ExplorerApp {
  name: string;
  href: string;
  icon: string;
}

interface ExplorerTab {
  label: string;
  apps: ExplorerApp[];
}

export const explorerTabs: ExplorerTab[] = [
  {
    label: 'All apps',
    apps: [
      { name: 'ALEX', href: 'https://www.alexlab.co/swap', icon: '/marketing/explorer/alex.png' },
      {
        name: 'Arkadiko',
        href: 'https://app.arkadiko.finance/',
        icon: '/marketing/explorer/arkadiko.png',
      },
      {
        name: 'Bitflow',
        href: 'https://app.bitflow.finance/trade',
        icon: '/marketing/explorer/bitflow.png',
      },
      {
        name: 'Brotocol',
        href: 'https://brotocol.xyz/bitcoin/swap',
        icon: '/marketing/explorer/brotocol.png',
      },
      {
        name: 'Charisma',
        href: 'https://swap.charisma.rocks/swap',
        icon: '/marketing/explorer/charisma.png',
      },
      {
        name: 'Granite',
        href: 'https://app.granite.world/',
        icon: '/marketing/explorer/granite.png',
      },
      { name: 'LISA', href: 'https://app.lisalab.io/', icon: '/marketing/explorer/lisa.png' },
      {
        name: 'Hermetica',
        href: 'https://app.hermetica.fi/swap',
        icon: '/marketing/explorer/hermetica.png',
      },
      { name: 'Velar', href: 'https://app.velar.com/swap', icon: '/marketing/explorer/velar.png' },
      {
        name: 'StackingDAO',
        href: 'https://app.stackingdao.com/',
        icon: '/marketing/explorer/stacking-dao.png',
      },
      { name: 'Zest', href: 'https://app.zestprotocol.com/', icon: '/marketing/explorer/zest.png' },
    ],
  },
  {
    label: 'Lock in a pool',
    apps: [
      { name: 'Fast Pool', href: stakingPaths.index, icon: '/icons/fastpool.svg' },
      { name: 'Fast Pool V2', href: stakingPaths.index, icon: '/icons/fastpool.svg' },
      { name: 'Plan Better', href: stakingPaths.index, icon: '/marketing/explorer/planbetter.png' },
      { name: 'Restake', href: stakingPaths.index, icon: '/marketing/explorer/restake.png' },
      { name: 'Xverse', href: stakingPaths.index, icon: '/marketing/explorer/xverse.png' },
      {
        name: 'Stacking DAO',
        href: stakingPaths.index,
        icon: '/marketing/explorer/stacking-dao.png',
      },
    ],
  },
  {
    label: 'Stay liquid',
    apps: [
      { name: 'LISA', href: stakingPaths.index, icon: '/marketing/explorer/lisa.png' },
      {
        name: 'StackingDAO',
        href: stakingPaths.index,
        icon: '/marketing/explorer/stacking-dao.png',
      },
    ],
  },
];
