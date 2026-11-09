import { useState } from 'react';

import { Box, Flex, VStack, styled } from 'leather-styles/jsx';
import { FeaturedAppsCarousel } from '~/components/marketing/featured-apps-carousel';
import { ExternalLinkButton, LinkButton } from '~/components/marketing/link-button';
import { MarketingHeading } from '~/components/marketing/marketing-heading';
import {
  explorerAppFilters,
  explorerApps,
  explorerFeaturedApps,
  marketingAsset,
} from '~/content/marketing-content';
import { marketingCacheHeaders, marketingMeta } from '~/pages/seo/marketing-meta';

export const handle = { chrome: 'none' };

export function meta() {
  return marketingMeta({
    title: 'Explorer',
    path: '/explorer',
    description: 'Grow your Bitcoin with apps that earn on Stacks.',
  });
}

export function headers() {
  return marketingCacheHeaders;
}

function ExplorerHero() {
  return (
    <Flex
      justifyContent="space-between"
      alignItems="center"
      gap="space.04"
      px="space.05"
      pt="space.07"
    >
      <Box>
        <MarketingHeading>
          Grow your
          <br />
          Bitcoin
        </MarketingHeading>
        <styled.p mt="space.02" textStyle="label.01" maxWidth="180px">
          Up to 8% with direct wallet payouts
        </styled.p>
        <LinkButton to="/sbtc" size="sm" mt="space.05">
          Get sBTC
        </LinkButton>
      </Box>
      <Box position="relative" width="140px" height="160px" flexShrink={0} aria-hidden>
        <styled.img
          src={marketingAsset('images/explorer-piggy.png')}
          alt=""
          position="absolute"
          top={0}
          left={0}
          width="96px"
        />
        <styled.img
          src={marketingAsset('images/explorer-hourglass.png')}
          alt=""
          position="absolute"
          bottom={0}
          right={0}
          width="96px"
        />
      </Box>
    </Flex>
  );
}

function ExplorerAppList() {
  const [activeFilter, setActiveFilter] = useState(explorerAppFilters[0]?.category ?? null);
  const visibleApps = explorerApps.filter(
    ({ categories }) => activeFilter === null || categories.includes(activeFilter)
  );

  return (
    <styled.section px="space.05">
      <MarketingHeading>
        More apps to
        <br />
        earn in Stacks
      </MarketingHeading>
      <Flex role="tablist" aria-label="Filter apps" mt="space.05" borderBottom="default">
        {explorerAppFilters.map(filter => {
          const isActive = filter.category === activeFilter;
          return (
            <styled.button
              key={filter.label}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveFilter(filter.category)}
              flex={1}
              py="space.04"
              textStyle="label.01"
              fontWeight="normal"
              color={isActive ? 'ink.text-primary' : 'ink.text-subdued'}
              borderBottom="2px solid"
              borderColor={isActive ? 'ink.text-primary' : 'transparent'}
              mb="-1px"
            >
              {filter.label}
            </styled.button>
          );
        })}
      </Flex>
      <VStack as="ul" role="tabpanel" alignItems="stretch" gap="space.05" mt="space.05">
        {visibleApps.map(({ app, name, url }) => (
          <Flex as="li" key={name} alignItems="center" gap="space.03">
            <styled.img src={app.logo} alt="" width="40px" height="40px" borderRadius="xs" />
            <styled.span flex={1} textStyle="label.02">
              {name}
            </styled.span>
            <ExternalLinkButton
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              size="sm"
              aria-label={`Open ${name}`}
            >
              Open
            </ExternalLinkButton>
          </Flex>
        ))}
      </VStack>
      <styled.p
        mt="space.06"
        pt="space.04"
        borderTop="default"
        textStyle="caption.01"
        color="ink.text-subdued"
      >
        Leather does not operate or manage any Stacking pools or liquid Stacking protocols. Users
        are responsible for evaluating the risks, terms, and smart contracts involved in any
        third-party options they access through Leather.
      </styled.p>
    </styled.section>
  );
}

export default function ExplorerRoute() {
  return (
    <VStack alignItems="stretch" gap="space.08" maxWidth="420px" mx="auto" pb="space.08">
      <ExplorerHero />
      <Box pl="space.05">
        <FeaturedAppsCarousel apps={explorerFeaturedApps} cardWidth="280px" />
      </Box>
      <ExplorerAppList />
    </VStack>
  );
}
