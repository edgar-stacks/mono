import { marketingLinks } from '~/features/marketing/marketing-links';

export interface CoreToken {
  symbol: string;
  name?: string;
  icon: string;
  description: string;
  action: { label: 'Buy' } | { label: 'Get'; href: string };
  issuer?: { name: string; href: string };
}

export const coreTokens: CoreToken[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    icon: '/marketing/apps/btc.svg',
    description:
      'The most secure and decentralized asset. BTC can be safely stored in Leather and used across Bitcoin and Stacks apps.',
    action: { label: 'Buy' },
  },
  {
    symbol: 'STX',
    name: 'Stacks',
    icon: '/marketing/apps/stx.png',
    description:
      'The token that powers Stacks. STX is used to pay for transactions and can be staked to earn Bitcoin rewards on the network.',
    action: { label: 'Buy' },
  },
  {
    symbol: 'sBTC',
    icon: '/marketing/apps/sbtc.png',
    description:
      'A 1:1 BTC backed that does not rely on a centralized custodian. Lets you use Bitcoin in Stacks apps.',
    action: { label: 'Get', href: marketingLinks.sbtcBridge },
  },
  {
    symbol: 'USDCx',
    icon: '/marketing/apps/usdcx.svg',
    description:
      'A 1:1 USD-backed stablecoin issued by Circle via xReserve and native to Stacks for payments and on-chain stability.',
    action: { label: 'Get', href: marketingLinks.usdcxBridge },
    issuer: { name: 'Circle', href: 'https://www.circle.com/' },
  },
];

interface Project {
  name: string;
  description: string;
  href: string;
  logo: string;
}

export const projects: Project[] = [
  {
    name: 'ALEX',
    description:
      'A DeFi platform on Stacks offering swaps, staking, fixed-term lending, and cross-chain liquidity with Bitcoin security',
    href: '/posts/alex',
    logo: '/marketing/logos/alex.png',
  },
  {
    name: 'Arkadiko',
    description:
      'A Bitcoin-secured protocol for vault-based borrowing, USDA minting, and decentralized smart contract automation.',
    href: '/posts/arkadiko',
    logo: '/marketing/logos/arkadiko.svg',
  },
  {
    name: 'Bitflow',
    description:
      'A Bitcoin-native DEX aggregator and liquidity hub that sources the best prices across Stacks-based protocols.',
    href: '/posts/bitflow',
    logo: '/marketing/logos/bitflow.png',
  },
  {
    name: 'BNS One',
    description:
      'BNS One is a Bitcoin Name System platform for registering and managing .btc domain names on Bitcoin via the Stacks blockchain.',
    href: '/posts/bns',
    logo: '/marketing/logos/bns-one.png',
  },
  {
    name: 'BNSv2 Hub',
    description:
      'BNS Hub is the BNS V2 management platform for registering names, creating namespaces, and building with the BNS protocol on Stacks.',
    href: '/posts/bns',
    logo: '/marketing/logos/bns-hub.png',
  },
  {
    name: 'Brotocol',
    description:
      'A Bitcoin-native DeFi platform accessible via Leather-connected apps like BroBridge and BroSwap',
    href: '/posts/brotocol',
    logo: '/marketing/logos/brotocol.jpg',
  },
  {
    name: 'Charisma',
    description:
      'A modular DeFi platform for vaults, swaps, and programmable token infrastructure on Stacks',
    href: '/posts/charisma',
    logo: '/marketing/logos/charisma.png',
  },
  {
    name: 'Granite',
    description:
      'Use sBTC to borrow stablecoins non-custodially, without risk of forced liquidations',
    href: '/posts/granite',
    logo: '/marketing/logos/granite.svg',
  },
  {
    name: 'Hermetica',
    description:
      'A Bitcoin-backed synthetic dollar that generates up to 25% APY through delta-neutral strategies',
    href: '/posts/hermetica',
    logo: '/marketing/logos/hermetica.svg',
  },
  {
    name: 'LISA',
    description:
      'A liquid staking protocol built on Stacks that lets you earn yield on assets like STX and ALEX—without locking them up.',
    href: '/posts/lisa',
    logo: '/marketing/logos/lisa.png',
  },
  {
    name: 'Stacking DAO',
    description:
      'Stacking infrastructure offering native and liquid options with BTC and STX-based yield',
    href: '/posts/stacking-dao',
    logo: '/marketing/logos/stacking-dao.jpg',
  },
  {
    name: 'STX City - BNS Gateway',
    description:
      'BNS Gateway on STX.CITY is a marketplace and registration platform for .btc domains, with analytics, social features, and domain exploration tools.',
    href: '/posts/bns',
    logo: '/marketing/logos/bns-gateway.png',
  },
  {
    name: 'Velar',
    description:
      'A DeFi suite offering trading, liquidity, and launchpad access built on Bitcoin L2s like Stacks',
    href: '/posts/velar',
    logo: '/marketing/logos/velar.jpg',
  },
  {
    name: 'Zest Protocol',
    description:
      'A Bitcoin-native protocol on Stacks for borrowing, lending, and yield generation through overcollateralized loans and BTC staking pools',
    href: '/posts/zest',
    logo: '/marketing/logos/zest.svg',
  },
];
