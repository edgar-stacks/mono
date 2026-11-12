interface YieldProvider {
  name: string;
  icon: string;
  value: string;
}

export interface YieldGroup {
  title: string;
  description: string;
  providers: YieldProvider[];
}

export interface YieldProduct {
  name: string;
  icon: string;
  cta: string;
  href: string;
  headlineYield: string;
  groups: YieldGroup[];
}

const stackingDao = { name: 'Stacking DAO', icon: '/icons/stacking-dao.webp' };

export const pooledStakingGroup: YieldGroup = {
  title: 'Pooled staking',
  description:
    'Stake with others to earn BTC. Your STX stay locked for each cycle, and you earn steady rewards.',
  providers: [
    { ...stackingDao, value: '9.27%' },
    { name: 'Fast pool', icon: '/icons/fastpool.svg', value: '8.59%' },
    { name: 'PlanBetter', icon: '/icons/planbetter.webp', value: '8.57%' },
  ],
};

export const liquidStakingGroup: YieldGroup = {
  title: 'Liquid Staking',
  description:
    'Keep your STX flexible and still earn BTC. Get a liquid token that lets you trade or use your staked STX anytime.',
  providers: [{ ...stackingDao, value: '8.72%' }],
};

export const yieldProducts: YieldProduct[] = [
  {
    name: 'sBTC',
    icon: '/icons/sbtc.svg',
    cta: 'Earn BTC',
    href: '/sbtc',
    headlineYield: '5%',
    groups: [
      {
        title: 'Bitcoin on layer 2',
        description:
          'Turn your Bitcoin into an active asset. Earn rewards, use it in DeFi, and explore new ways to grow your BTC on layer 2.',
        providers: [
          {
            name: 'sBTC Rewards Program',
            icon: '/icons/sbtc.svg',
            value: 'Up to 5% on your Bitcoin, paid in sBTC',
          },
          { name: 'Zest', icon: '/icons/zest.svg', value: '5.2%' },
          { name: 'Bitflow', icon: '/icons/bitflow.png', value: '5.1%' },
        ],
      },
    ],
  },
  {
    name: 'Staking',
    icon: '/icons/stacks.svg',
    cta: 'Start Staking',
    href: '/staking',
    headlineYield: '6–10%',
    groups: [pooledStakingGroup, liquidStakingGroup],
  },
];
