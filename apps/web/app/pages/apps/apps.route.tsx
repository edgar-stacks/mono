import { Link } from 'react-router';

import { Box, Flex, Grid, VStack, styled } from 'leather-styles/jsx';
import { ChangelogStrip } from '~/components/marketing/changelog-strip';
import { fetchChangelogStrip } from '~/components/marketing/changelog-strip.query';
import { FeaturedAppsCarousel } from '~/components/marketing/featured-apps-carousel';
import { ExternalLinkButton } from '~/components/marketing/link-button';
import { MarketingHeading } from '~/components/marketing/marketing-heading';
import { YieldGroupTable } from '~/components/marketing/yield-group-table';
import {
  coreTokens,
  featuredApps,
  liquidStakingGroup,
  marketingAsset,
  pooledStakingGroup,
  projectApps,
} from '~/content/marketing-content';
import { Page } from '~/layouts/page/page';
import { getPostPath } from '~/pages/redirects/content-slug-resolver';
import { marketingCacheHeaders, marketingMeta } from '~/pages/seo/marketing-meta';

import { type Route } from './+types/apps.route';
import { InstallButton } from './install-button';

export function meta() {
  return marketingMeta({ title: 'Apps', path: '/apps' });
}

export function headers() {
  return marketingCacheHeaders;
}

export async function loader() {
  return { changelogEntries: await fetchChangelogStrip() };
}

function CoreTokens() {
  return (
    <styled.section>
      <MarketingHeading>Core tokens</MarketingHeading>
      <Grid
        as="ul"
        mt="space.06"
        gridTemplateColumns={['1fr', 'repeat(2, 1fr)', null, 'repeat(4, 1fr)']}
        gap="space.03"
      >
        {coreTokens.map(token => (
          <Flex
            as="li"
            key={token.symbol}
            flexDir="column"
            gap="space.06"
            p="space.05"
            bg="ink.background-secondary"
            borderRadius="md"
          >
            <Flex alignItems="center" gap="space.03">
              <styled.img src={token.icon} alt="" width="48px" height="48px" borderRadius="round" />
              <Box flex={1}>
                <styled.h3 textStyle="label.01">{token.symbol}</styled.h3>
                {token.name && (
                  <styled.span textStyle="body.02" color="ink.text-subdued">
                    {token.name}
                  </styled.span>
                )}
              </Box>
              {token.action.href ? (
                <ExternalLinkButton
                  href={token.action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  size="sm"
                  aria-label={`${token.action.label} ${token.symbol}`}
                >
                  {token.action.label}
                </ExternalLinkButton>
              ) : (
                <InstallButton aria-label={`${token.action.label} ${token.symbol}`}>
                  {token.action.label}
                </InstallButton>
              )}
            </Flex>
            <styled.p textStyle="body.02" color="ink.text-subdued">
              {token.description}
            </styled.p>
          </Flex>
        ))}
      </Grid>
    </styled.section>
  );
}

function EarningOnStacks() {
  return (
    <styled.section>
      <MarketingHeading>Earning on Stacks</MarketingHeading>
      <Grid mt="space.06" gridTemplateColumns={['1fr', null, null, '2fr 1fr 1fr']} gap="space.03">
        <Flex
          flexDir="column"
          justifyContent="space-between"
          border="default"
          borderRadius="md"
          overflow="hidden"
        >
          <VStack alignItems="flex-start" gap="space.03" p="space.05">
            <styled.h3 textStyle="heading.05">Dual stacking</styled.h3>
            <styled.p textStyle="label.01">Up to 5% APY in sBTC</styled.p>
            <styled.p textStyle="body.02" color="ink.text-subdued">
              Hold sBTC & boost with STX Stacking or DeFi
            </styled.p>
            <ExternalLinkButton
              href="https://app.stacks.co/"
              target="_blank"
              rel="noopener noreferrer"
              mt="space.03"
            >
              Start earning
            </ExternalLinkButton>
          </VStack>
          <styled.img
            src={marketingAsset('images/dual-stacking-coins.png')}
            alt=""
            alignSelf="flex-end"
            width="100%"
            maxWidth="414px"
            loading="lazy"
          />
        </Flex>
        {[pooledStakingGroup, liquidStakingGroup].map(group => (
          <Box key={group.title} p="space.05" border="default" borderRadius="md">
            <YieldGroupTable group={group} />
          </Box>
        ))}
      </Grid>
    </styled.section>
  );
}

function Projects() {
  return (
    <styled.section>
      <MarketingHeading>Projects</MarketingHeading>
      <Grid
        as="ul"
        mt="space.06"
        gridTemplateColumns={['1fr', null, 'repeat(3, 1fr)']}
        gap={0}
        border="default"
        borderRadius="md"
        overflow="hidden"
      >
        {projectApps.map(app => (
          <styled.li
            key={app.name}
            borderRight="default"
            borderBottom="default"
            mr="-1px"
            mb="-1px"
          >
            <Link to={getPostPath(app.postSlug)}>
              <Flex
                flexDir="column"
                gap="space.02"
                height="100%"
                p="space.05"
                _hover={{ bg: 'ink.component-background-hover' }}
              >
                <styled.img
                  src={app.logo}
                  alt=""
                  width="48px"
                  height="48px"
                  borderRadius="xs"
                  mb="space.03"
                  loading="lazy"
                />
                <styled.h3 textStyle="heading.05" fontWeight="normal">
                  {app.name}
                </styled.h3>
                <styled.p textStyle="caption.01" lineClamp={2}>
                  {app.description}
                </styled.p>
              </Flex>
            </Link>
          </styled.li>
        ))}
      </Grid>
    </styled.section>
  );
}

export default function AppsRoute({ loaderData }: Route.ComponentProps) {
  return (
    <Page>
      <Page.Header title="Explore" />
      <VStack alignItems="stretch" gap={['space.09', null, 'space.10']} mt="space.07" mb="space.10">
        <CoreTokens />
        <EarningOnStacks />
        <styled.section>
          <MarketingHeading>Featured apps</MarketingHeading>
          <Box mt="space.06">
            <FeaturedAppsCarousel apps={featuredApps} />
          </Box>
        </styled.section>
        <Projects />
        <ChangelogStrip entries={loaderData.changelogEntries} />
      </VStack>
    </Page>
  );
}
