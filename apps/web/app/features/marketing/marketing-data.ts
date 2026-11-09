import { LEATHER_EXTENSION_CHROME_STORE_URL } from '@leather.io/constants';

export const marketingAssetPath = '/marketing';

export const downloadLinks = {
  chrome: LEATHER_EXTENSION_CHROME_STORE_URL,
  ios: 'https://apps.apple.com/us/app/leather-self-custody-wallet/id6499127775',
  android: 'https://play.google.com/store/apps/details?id=io.leather.mobilewallet',
};

export interface YieldProvider {
  name: string;
  logo: string;
  yield: string;
  description?: string;
}

export const sbtcProviders: YieldProvider[] = [
  {
    name: 'sBTC Rewards Program',
    logo: `${marketingAssetPath}/images/provider-sbtc-rewards.png`,
    yield: '5%',
    description: 'Up to 5% on your Bitcoin, paid in sBTC',
  },
  { name: 'Zest', logo: `${marketingAssetPath}/images/provider-zest.png`, yield: '5.2%' },
  { name: 'Bitflow', logo: `${marketingAssetPath}/images/provider-bitflow.png`, yield: '5.1%' },
];

export const pooledStakingProviders: YieldProvider[] = [
  {
    name: 'Stacking DAO',
    logo: `${marketingAssetPath}/images/provider-stacking-dao.png`,
    yield: '9.27%',
  },
  {
    name: 'Fast pool',
    logo: `${marketingAssetPath}/images/provider-fast-pool.png`,
    yield: '8.59%',
  },
  {
    name: 'PlanBetter',
    logo: `${marketingAssetPath}/images/provider-planbetter.png`,
    yield: '8.57%',
  },
];

export const liquidStakingProviders: YieldProvider[] = [
  {
    name: 'Stacking DAO',
    logo: `${marketingAssetPath}/images/provider-stacking-dao.png`,
    yield: '8.72%',
  },
];

export interface EcosystemApp {
  name: string;
  slug: string;
  description: string;
  logo: string;
  cover?: string;
  url?: string;
}

function appLogo(file: string) {
  return `${marketingAssetPath}/apps/${file}`;
}

const alex: EcosystemApp = {
  name: 'ALEX',
  slug: 'alex',
  description:
    'A DeFi platform on Stacks offering swaps, staking, fixed-term lending, and cross-chain liquidity with Bitcoin security',
  logo: appLogo('alex.png'),
  cover: appLogo('cover-alex.png'),
  url: 'https://www.alexlab.co/swap',
};

const arkadiko: EcosystemApp = {
  name: 'Arkadiko',
  slug: 'arkadiko',
  description:
    'A Bitcoin-secured protocol for vault-based borrowing, USDA minting, and decentralized smart contract automation.',
  logo: appLogo('arkadiko.svg'),
  cover: appLogo('cover-arkadiko.png'),
  url: 'https://app.arkadiko.finance/',
};

const bitflow: EcosystemApp = {
  name: 'Bitflow',
  slug: 'bitflow',
  description:
    'A Bitcoin-native DEX aggregator and liquidity hub that sources the best prices across Stacks-based protocols.',
  logo: appLogo('bitflow.png'),
  cover: appLogo('cover-bitflow.png'),
  url: 'https://app.bitflow.finance/trade',
};

const zest: EcosystemApp = {
  name: 'Zest Protocol',
  slug: 'zest',
  description:
    'A Bitcoin-native protocol on Stacks for borrowing, lending, and yield generation through overcollateralized loans and BTC staking pools',
  logo: appLogo('zest.svg'),
  cover: appLogo('cover-zest.png'),
  url: 'https://app.zestprotocol.com/',
};

const hermetica: EcosystemApp = {
  name: 'Hermetica',
  slug: 'hermetica',
  description:
    'A Bitcoin-backed synthetic dollar that generates up to 25% APY through delta-neutral strategies',
  logo: appLogo('hermetica.svg'),
  cover: appLogo('cover-hermetica.png'),
  url: 'https://app.hermetica.fi/swap',
};

const granite: EcosystemApp = {
  name: 'Granite',
  slug: 'granite',
  description:
    'Use sBTC to borrow stablecoins non-custodially, without risk of forced liquidations',
  logo: appLogo('granite.svg'),
  cover: appLogo('cover-granite.png'),
  url: 'https://app.granite.world/',
};

const bnsOne: EcosystemApp = {
  name: 'BNS One',
  slug: 'bns-one',
  description:
    'BNS One is a Bitcoin Name System platform for registering and managing .btc domain names on Bitcoin via the Stacks blockchain.',
  logo: appLogo('bns-one.png'),
};

const bnsHub: EcosystemApp = {
  name: 'BNSv2 Hub',
  slug: 'bns-hub',
  description:
    'BNS Hub is the BNS V2 management platform for registering names, creating namespaces, and building with the BNS protocol on Stacks.',
  logo: appLogo('bns-hub.png'),
};

const brotocol: EcosystemApp = {
  name: 'Brotocol',
  slug: 'brotocol',
  description:
    'A Bitcoin-native DeFi platform accessible via Leather-connected apps like BroBridge and BroSwap',
  logo: appLogo('brotocol.jpg'),
  url: 'https://brotocol.xyz/bitcoin/swap',
};

const charisma: EcosystemApp = {
  name: 'Charisma',
  slug: 'charisma',
  description:
    'A modular DeFi platform for vaults, swaps, and programmable token infrastructure on Stacks',
  logo: appLogo('charisma.png'),
  url: 'https://swap.charisma.rocks/swap',
};

const lisa: EcosystemApp = {
  name: 'LISA',
  slug: 'lisa',
  description:
    'A liquid staking protocol built on Stacks that lets you earn yield on assets like STX and ALEX—without locking them up.',
  logo: appLogo('lisa.png'),
  url: 'https://app.lisalab.io/',
};

const stackingDao: EcosystemApp = {
  name: 'Stacking DAO',
  slug: 'stacking-dao',
  description:
    'Stacking infrastructure offering native and liquid options with BTC and STX-based yield',
  logo: appLogo('stacking-dao.jpg'),
  url: 'https://app.stackingdao.com/',
};

const bnsGateway: EcosystemApp = {
  name: 'STX City - BNS Gateway',
  slug: 'bns-gateway',
  description:
    'BNS Gateway on STX.CITY is a marketplace and registration platform for .btc domains, with analytics, social features, and domain exploration tools.',
  logo: appLogo('bns-gateway.png'),
};

const velar: EcosystemApp = {
  name: 'Velar',
  slug: 'velar',
  description:
    'A DeFi suite offering trading, liquidity, and launchpad access built on Bitcoin L2s like Stacks',
  logo: appLogo('velar.jpg'),
  url: 'https://app.velar.com/swap',
};

export const featuredApps = [bitflow, zest, hermetica, granite, arkadiko];

export const projectApps = [
  alex,
  arkadiko,
  bitflow,
  bnsOne,
  bnsHub,
  brotocol,
  charisma,
  granite,
  hermetica,
  lisa,
  stackingDao,
  bnsGateway,
  velar,
  zest,
];

export const explorerFeaturedApps = [bitflow, zest, hermetica, granite, alex, arkadiko];

interface ExplorerTab {
  label: string;
  apps: EcosystemApp[];
}

export const explorerTabs: ExplorerTab[] = [
  {
    label: 'All apps',
    apps: [
      alex,
      arkadiko,
      bitflow,
      brotocol,
      charisma,
      granite,
      lisa,
      hermetica,
      velar,
      stackingDao,
      zest,
    ],
  },
  { label: 'Lock in a pool', apps: [stackingDao] },
  { label: 'Stay liquid', apps: [stackingDao, lisa] },
];

interface DeveloperDocLink {
  title: string;
  slug: string;
}

export const developerDocLinks: DeveloperDocLink[] = [
  { title: 'Introduction to Leather APIs', slug: 'api-overview' },
  { title: 'getAddresses API method', slug: 'api-get-addresses' },
  { title: 'Open API method', slug: 'api-open' },
  { title: 'sendTransfer API method', slug: 'api-send-transfer' },
  { title: 'signMessage API method', slug: 'signmessage-api-method' },
  { title: 'signPsbt API method', slug: 'api-sign-psbt' },
  { title: 'stx_transferStx API method', slug: 'api-stx-transferstx' },
  { title: 'stx_signTransaction API method', slug: 'api-stx-signtransaction' },
  { title: 'stx_signMessage API method', slug: 'api-stx-signmessage' },
  { title: 'stx_signStructuredMessage API method', slug: 'stx-signstructuredmessage-api-method' },
  { title: 'stx_deployContract API method', slug: 'api-stx-deploycontract' },
  { title: 'stx_callContract API method', slug: 'api-stx-callcontract' },
  { title: 'Stacks libraries', slug: 'stacks-libraries' },
];
