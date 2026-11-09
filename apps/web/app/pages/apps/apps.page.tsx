import { type ReactNode } from 'react';

import { Flex, VStack, styled } from 'leather-styles/jsx';
import { ChangelogStrip } from '~/features/marketing/changelog-strip';
import {
  AppListItem,
  CardGrid,
  FeaturedAppCard,
  MarketingSection,
  YieldCard,
} from '~/features/marketing/marketing-components';
import {
  featuredApps,
  liquidStakingProviders,
  pooledStakingProviders,
  projectApps,
} from '~/features/marketing/marketing-data';
import { type ChangelogHighlight } from '~/features/marketing/marketing.queries';
import { Page } from '~/layouts/page/page';

import { BtcAvatarIcon, SbtcAvatarIcon, StxAvatarIcon, UsdcxAvatarIcon } from '@leather.io/ui';

interface CoreToken {
  symbol: string;
  name: string;
  description: ReactNode;
  icon: ReactNode;
  action?: { label: string; href: string };
}

const coreTokens: CoreToken[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    description:
      'The most secure and decentralized asset. BTC can be safely stored in Leather and used across Bitcoin and Stacks apps.',
    icon: <BtcAvatarIcon />,
  },
  {
    symbol: 'STX',
    name: 'Stacks',
    description:
      'The token that powers Stacks. STX is used to pay for transactions and can be staked to earn Bitcoin rewards on the network.',
    icon: <StxAvatarIcon />,
  },
  {
    symbol: 'sBTC',
    name: 'sBTC',
    description:
      'A 1:1 BTC backed that does not rely on a centralized custodian. Lets you use Bitcoin in Stacks apps.',
    icon: <SbtcAvatarIcon />,
    action: { label: 'Get', href: 'https://sbtc.stacks.co/' },
  },
  {
    symbol: 'USDCx',
    name: 'USDCx',
    description:
      'A 1:1 USD-backed stablecoin issued by Circle via xReserve and native to Stacks for payments and on-chain stability.',
    icon: <UsdcxAvatarIcon />,
    action: {
      label: 'Get',
      href: 'https://bridge.stacks.co/usdc/eth/stx?recipient=SP1ZS9BX25WFYGHKHGY399057HT4MBH6TQMS8ZKTE',
    },
  },
];

interface CoreTokenCardProps {
  token: CoreToken;
}

function CoreTokenCard({ token }: CoreTokenCardProps) {
  return (
    <VStack alignItems="flex-start" gap="space.04" p="space.05" borderRadius="md" border="default">
      <Flex justifyContent="space-between" width="100%" alignItems="center">
        <Flex alignItems="center" gap="space.03">
          {token.icon}
          <VStack alignItems="flex-start" gap="0">
            <styled.h3 textStyle="label.01">{token.symbol}</styled.h3>
            <styled.span textStyle="caption.01" color="ink.text-subdued">
              {token.name}
            </styled.span>
          </VStack>
        </Flex>
        {token.action && (
          <styled.a
            href={token.action.href}
            target="_blank"
            rel="noopener noreferrer"
            textStyle="label.02"
            border="default"
            borderRadius="round"
            px="space.04"
            py="space.02"
            _hover={{ bg: 'ink.component-background-hover' }}
          >
            {token.action.label}
          </styled.a>
        )}
      </Flex>
      <styled.p textStyle="body.02" color="ink.text-subdued">
        {token.description}
      </styled.p>
    </VStack>
  );
}

interface AppsPageProps {
  changelogEntries: ChangelogHighlight[];
}

export function AppsPage({ changelogEntries }: AppsPageProps) {
  return (
    <Page>
      <Page.Header />
      <MarketingSection
        eyebrow="Explore"
        title="core tokens"
        pt={['space.05', 'space.05', 'space.07']}
      >
        <CardGrid columns={4}>
          {coreTokens.map(token => (
            <CoreTokenCard key={token.symbol} token={token} />
          ))}
        </CardGrid>
      </MarketingSection>

      <MarketingSection title="earning on stacks">
        <CardGrid columns={3}>
          <styled.a href="https://app.stacks.co/" target="_blank" rel="noopener noreferrer">
            <VStack
              alignItems="flex-start"
              gap="space.03"
              p="space.05"
              height="100%"
              borderRadius="md"
              border="default"
              _hover={{ bg: 'ink.component-background-hover' }}
            >
              <styled.h3 textStyle="heading.05">Dual stacking</styled.h3>
              <styled.span textStyle="display.02">Up to 5% APY in sBTC</styled.span>
              <styled.p textStyle="body.02" color="ink.text-subdued">
                Hold sBTC & boost with STX Stacking or DeFi
              </styled.p>
              <styled.span textStyle="label.02" textDecoration="underline">
                Start earning
              </styled.span>
            </VStack>
          </styled.a>
          <YieldCard
            title="Pooled staking"
            description="Stake with others to earn BTC. Your STX stay locked for each cycle, and you earn steady rewards."
            providers={pooledStakingProviders}
            href="/staking"
          />
          <YieldCard
            title="Liquid Staking"
            description="Keep your STX flexible and still earn BTC. Get a liquid token that lets you trade or use your staked STX anytime."
            providers={liquidStakingProviders}
            href="/staking"
          />
        </CardGrid>
      </MarketingSection>

      <MarketingSection title="Featured apps">
        <CardGrid columns={3}>
          {featuredApps.map(app => (
            <FeaturedAppCard key={app.slug} app={app} />
          ))}
        </CardGrid>
      </MarketingSection>

      <MarketingSection title="projects">
        <CardGrid columns={2}>
          {projectApps.map(app => (
            <AppListItem key={app.slug} app={app} />
          ))}
        </CardGrid>
      </MarketingSection>

      <ChangelogStrip entries={changelogEntries} />
    </Page>
  );
}
