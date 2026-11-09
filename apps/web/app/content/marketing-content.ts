import { LEATHER_EXTENSION_CHROME_STORE_URL } from '@leather.io/constants';

const marketingAssetsPath = '/marketing';

export function marketingAsset(path: string) {
  return `${marketingAssetsPath}/${path}`;
}

export const downloadLinks = [
  {
    label: 'Chrome',
    href: LEATHER_EXTENSION_CHROME_STORE_URL,
    icon: marketingAsset('platforms/chrome.png'),
  },
  {
    label: 'iOS',
    href: 'https://apps.apple.com/us/app/leather-self-custody-wallet/id6499127775',
    icon: marketingAsset('platforms/ios.png'),
  },
  {
    label: 'Android',
    href: 'https://play.google.com/store/apps/details?id=io.leather.mobilewallet',
    icon: marketingAsset('platforms/android.png'),
  },
];

export const heroWords = ['Buy.', 'Send.', 'Swap.', 'Earn.', 'Grow.'];

export const buyPartners = [
  { name: 'Coinbase', logo: marketingAsset('partners/coinbase.svg') },
  { name: 'Binance', logo: marketingAsset('partners/binance.svg') },
  { name: 'MoonPay', logo: marketingAsset('partners/moonpay.svg') },
  { name: 'Gate', logo: marketingAsset('partners/gate.svg') },
];

export const swapProviders = ['Bitflow', 'Velar', 'sBTC Bridge', 'ALEX'];

export const ledgerFeatures = [
  'Smart signing for a safer Ledger experience',
  'Seamless multi-chain BTC & STX experience',
  'Connect once and sign smoothly',
];

interface ProviderYield {
  name: string;
  icon: string;
  yield: string;
}

export interface YieldGroup {
  title: string;
  description: string;
  providers: ProviderYield[];
}

export interface YieldProduct {
  name: string;
  icon: string;
  href: string;
  cta: string;
  headlineYield: string;
  groups: YieldGroup[];
}

const stackingDao = {
  name: 'Stacking DAO',
  icon: marketingAsset('providers/stacking-dao.png'),
};

export const pooledStakingGroup: YieldGroup = {
  title: 'Pooled staking',
  description:
    'Stake with others to earn BTC. Your STX stay locked for each cycle, and you earn steady rewards.',
  providers: [
    { ...stackingDao, yield: '9.27%' },
    { name: 'Fast pool', icon: marketingAsset('providers/fast-pool.png'), yield: '8.59%' },
    { name: 'PlanBetter', icon: marketingAsset('providers/planbetter.png'), yield: '8.57%' },
  ],
};

export const liquidStakingGroup: YieldGroup = {
  title: 'Liquid Staking',
  description:
    'Keep your STX flexible and still earn BTC. Get a liquid token that lets you trade or use your staked STX anytime.',
  providers: [{ ...stackingDao, yield: '8.72%' }],
};

export const yieldProducts: YieldProduct[] = [
  {
    name: 'sBTC',
    icon: marketingAsset('tokens/sbtc.png'),
    href: '/sbtc',
    cta: 'Earn BTC',
    headlineYield: '5%',
    groups: [
      {
        title: 'Bitcoin on layer 2',
        description:
          'Turn your Bitcoin into an active asset. Earn rewards, use it in DeFi, and explore new ways to grow your BTC on layer 2.',
        providers: [
          {
            name: 'sBTC Rewards Program',
            icon: marketingAsset('tokens/sbtc.png'),
            yield: 'Up to 5% on your Bitcoin, paid in sBTC',
          },
          { name: 'Zest', icon: marketingAsset('providers/zest.png'), yield: '5.2%' },
          { name: 'Bitflow', icon: marketingAsset('providers/bitflow.png'), yield: '5.1%' },
        ],
      },
    ],
  },
  {
    name: 'Staking',
    icon: marketingAsset('tokens/stx.png'),
    href: '/staking',
    cta: 'Start Staking',
    headlineYield: '6–10%',
    groups: [pooledStakingGroup, liquidStakingGroup],
  },
];

export const trustPoints = [
  {
    title: 'Open source by design',
    description:
      'Transparent by design. Community-tested and reviewed to ensure the highest level of safety.',
    href: 'https://github.com/leather-io',
    logo: marketingAsset('images/trust-github.svg'),
    logoAlt: 'GitHub',
  },
  {
    title: 'Audited by Least Authority',
    description: 'Reviewed by one of the most respected security firms in the crypto industry.',
    href: 'https://leastauthority.com/blog/audit-of-hiros-stacks-wallet/',
    logo: marketingAsset('images/trust-least-authority.png'),
    logoAlt: 'Least Authority',
  },
  {
    title: 'Field tested by hackerone.com',
    description:
      'Validated by ethical hackers who continuously identify and resolve vulnerabilities.',
    href: 'https://hackerone.com/leather_wallet',
    logo: marketingAsset('images/trust-hackerone.png'),
    logoAlt: 'HackerOne',
  },
];

export const coreTokens = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    icon: marketingAsset('tokens/btc.svg'),
    action: { label: 'Buy' },
    description:
      'The most secure and decentralized asset. BTC can be safely stored in Leather and used across Bitcoin and Stacks apps.',
  },
  {
    symbol: 'STX',
    name: 'Stacks',
    icon: marketingAsset('tokens/stx.png'),
    action: { label: 'Buy' },
    description:
      'The token that powers Stacks. STX is used to pay for transactions and can be staked to earn Bitcoin rewards on the network.',
  },
  {
    symbol: 'sBTC',
    icon: marketingAsset('tokens/sbtc.png'),
    action: { label: 'Get', href: 'https://sbtc.stacks.co/' },
    description:
      'A 1:1 BTC backed that does not rely on a centralized custodian. Lets you use Bitcoin in Stacks apps.',
  },
  {
    symbol: 'USDCx',
    icon: marketingAsset('tokens/usdcx.svg'),
    action: {
      label: 'Get',
      href: 'https://bridge.stacks.co/usdc/eth/stx?recipient=SP1ZS9BX25WFYGHKHGY399057HT4MBH6TQMS8ZKTE',
    },
    description:
      'A 1:1 USD-backed stablecoin issued by Circle via xReserve and native to Stacks for payments and on-chain stability.',
  },
];

export interface MarketingApp {
  name: string;
  description: string;
  logo: string;
  postSlug: string;
  url?: string;
  banner?: string;
}

const apps = {
  alex: {
    name: 'ALEX',
    description:
      'A DeFi platform on Stacks offering swaps, staking, fixed-term lending, and cross-chain liquidity with Bitcoin security',
    logo: marketingAsset('apps/alex.png'),
    banner: marketingAsset('featured/alex.png'),
    postSlug: 'alex',
    url: 'https://www.alexlab.co/swap',
  },
  arkadiko: {
    name: 'Arkadiko',
    description:
      'A Bitcoin-secured protocol for vault-based borrowing, USDA minting, and decentralized smart contract automation.',
    logo: marketingAsset('apps/arkadiko.svg'),
    banner: marketingAsset('featured/arkadiko.png'),
    postSlug: 'arkadiko',
    url: 'https://app.arkadiko.finance/',
  },
  bitflow: {
    name: 'Bitflow',
    description:
      'A Bitcoin-native DEX aggregator and liquidity hub that sources the best prices across Stacks-based protocols.',
    logo: marketingAsset('apps/bitflow.png'),
    banner: marketingAsset('featured/bitflow.png'),
    postSlug: 'bitflow',
    url: 'https://app.bitflow.finance/trade',
  },
  bnsOne: {
    name: 'BNS One',
    description:
      'BNS One is a Bitcoin Name System platform for registering and managing .btc domain names on Bitcoin via the Stacks blockchain.',
    logo: marketingAsset('apps/bns-one.png'),
    postSlug: 'bns',
  },
  bnsHub: {
    name: 'BNSv2 Hub',
    description:
      'BNS Hub is the BNS V2 management platform for registering names, creating namespaces, and building with the BNS protocol on Stacks.',
    logo: marketingAsset('apps/bns-hub.png'),
    postSlug: 'bns',
  },
  brotocol: {
    name: 'Brotocol',
    description:
      'A Bitcoin-native DeFi platform accessible via Leather-connected apps like BroBridge and BroSwap',
    logo: marketingAsset('apps/brotocol.jpg'),
    postSlug: 'brotocol',
    url: 'https://brotocol.xyz/bitcoin/swap',
  },
  charisma: {
    name: 'Charisma',
    description:
      'A modular DeFi platform for vaults, swaps, and programmable token infrastructure on Stacks',
    logo: marketingAsset('apps/charisma.png'),
    postSlug: 'charisma',
    url: 'https://swap.charisma.rocks/swap',
  },
  granite: {
    name: 'Granite',
    description:
      'Use sBTC to borrow stablecoins non-custodially, without risk of forced liquidations',
    logo: marketingAsset('apps/granite.svg'),
    banner: marketingAsset('featured/granite.png'),
    postSlug: 'granite',
    url: 'https://app.granite.world/',
  },
  hermetica: {
    name: 'Hermetica',
    description:
      'A Bitcoin-backed synthetic dollar that generates up to 25% APY through delta-neutral strategies',
    logo: marketingAsset('apps/hermetica.svg'),
    banner: marketingAsset('featured/hermetica.png'),
    postSlug: 'hermetica',
    url: 'https://app.hermetica.fi/swap',
  },
  lisa: {
    name: 'LISA',
    description:
      'A liquid staking protocol built on Stacks that lets you earn yield on assets like STX and ALEX—without locking them up.',
    logo: marketingAsset('apps/lisa.png'),
    postSlug: 'lisa',
    url: 'https://app.lisalab.io/',
  },
  stackingDao: {
    name: 'Stacking DAO',
    description:
      'Stacking infrastructure offering native and liquid options with BTC and STX-based yield',
    logo: marketingAsset('apps/stacking-dao.jpg'),
    postSlug: 'stacking-dao',
    url: 'https://app.stackingdao.com/',
  },
  bnsGateway: {
    name: 'STX City - BNS Gateway',
    description:
      'BNS Gateway on STX.CITY is a marketplace and registration platform for .btc domains, with analytics, social features, and domain exploration tools.',
    logo: marketingAsset('apps/bns-gateway.png'),
    postSlug: 'bns',
  },
  velar: {
    name: 'Velar',
    description:
      'A DeFi suite offering trading, liquidity, and launchpad access built on Bitcoin L2s like Stacks',
    logo: marketingAsset('apps/velar.jpg'),
    postSlug: 'velar',
    url: 'https://app.velar.com/swap',
  },
  zest: {
    name: 'Zest Protocol',
    description:
      'A Bitcoin-native protocol on Stacks for borrowing, lending, and yield generation through overcollateralized loans and BTC staking pools',
    logo: marketingAsset('apps/zest.svg'),
    banner: marketingAsset('featured/zest.png'),
    postSlug: 'zest',
    url: 'https://app.zestprotocol.com/',
  },
} satisfies Record<string, MarketingApp>;

export const featuredApps: MarketingApp[] = [
  apps.bitflow,
  apps.zest,
  apps.hermetica,
  apps.granite,
  apps.arkadiko,
];

export const explorerFeaturedApps: MarketingApp[] = [
  apps.bitflow,
  apps.zest,
  apps.hermetica,
  apps.granite,
  apps.alex,
  apps.arkadiko,
];

export const projectApps: MarketingApp[] = [
  apps.alex,
  apps.arkadiko,
  apps.bitflow,
  apps.bnsOne,
  apps.bnsHub,
  apps.brotocol,
  apps.charisma,
  apps.granite,
  apps.hermetica,
  apps.lisa,
  apps.stackingDao,
  apps.bnsGateway,
  apps.velar,
  apps.zest,
];

type ExplorerAppCategory = 'pool' | 'liquid';

interface ExplorerApp {
  app: MarketingApp;
  name: string;
  url: string;
  categories: ExplorerAppCategory[];
}

function explorerApp(
  app: MarketingApp & { url: string },
  categories: ExplorerAppCategory[],
  name = app.name
): ExplorerApp {
  return { app, name, url: app.url, categories };
}

export const explorerAppFilters: { label: string; category: ExplorerAppCategory | null }[] = [
  { label: 'All apps', category: null },
  { label: 'Lock in a pool', category: 'pool' },
  { label: 'Stay liquid', category: 'liquid' },
];

export const explorerApps: ExplorerApp[] = [
  explorerApp(apps.alex, ['liquid']),
  explorerApp(apps.arkadiko, ['liquid']),
  explorerApp(apps.bitflow, ['liquid']),
  explorerApp(apps.brotocol, ['liquid']),
  explorerApp(apps.charisma, ['liquid']),
  explorerApp(apps.granite, ['liquid']),
  explorerApp(apps.lisa, ['liquid']),
  explorerApp(apps.hermetica, ['liquid']),
  explorerApp(apps.velar, ['liquid']),
  explorerApp(apps.stackingDao, ['pool', 'liquid'], 'StackingDAO'),
  explorerApp(apps.zest, ['liquid'], 'Zest'),
];

export const developerPosts = [
  { slug: 'api-overview', title: 'Introduction to Leather APIs' },
  { slug: 'api-get-addresses', title: 'getAddresses API method' },
  { slug: 'api-open', title: 'Open API method' },
  { slug: 'api-send-transfer', title: 'sendTransfer API method' },
  { slug: 'signmessage-api-method', title: 'signMessage API method' },
  { slug: 'api-sign-psbt', title: 'signPsbt API method' },
  { slug: 'api-stx-transferstx', title: 'stx_transferStx API method' },
  { slug: 'api-stx-signtransaction', title: 'stx_signTransaction API method' },
  { slug: 'api-stx-signmessage', title: 'stx_signMessage API method' },
  { slug: 'stx-signstructuredmessage-api-method', title: 'stx_signStructuredMessage API method' },
  { slug: 'api-stx-deploycontract', title: 'stx_deployContract API method' },
  { slug: 'api-stx-callcontract', title: 'stx_callContract API method' },
  { slug: 'stacks-libraries', title: 'Stacks libraries' },
];

const developerDocsUrl = 'https://leather.gitbook.io/developers/';

export const helpLinks = [
  {
    href: '/support',
    title: 'Help',
    description: 'Quick answers and support for common questions.',
    icon: marketingAsset('icons/help.svg'),
  },
  {
    href: '/posts',
    title: 'Guides',
    description: 'Simple walkthroughs to get you started.',
    icon: marketingAsset('icons/guides.svg'),
  },
  {
    href: developerDocsUrl,
    title: 'Developers',
    description: 'Docs and tools to help you build faster.',
    icon: marketingAsset('icons/developers.svg'),
  },
];
