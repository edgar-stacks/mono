import { Link } from 'react-router';

import { css } from 'leather-styles/css';
import { Box, Flex, Grid, styled } from 'leather-styles/jsx';
import { ChangelogStrip } from '~/features/marketing/changelog-strip';
import { type ChangelogStripEntry } from '~/features/marketing/changelog-strip.queries';
import { FeaturedAppsCarousel, appsPageFeaturedApps } from '~/features/marketing/featured-apps';
import { marketingLinks } from '~/features/marketing/marketing-links';
import { MarketingHeading, MarketingSection } from '~/features/marketing/section-heading';
import { YieldProviders } from '~/features/marketing/yield-cards';
import { liquidStakingGroup, pooledStakingGroup } from '~/features/marketing/yield-data';
import { Page } from '~/layouts/page/page';
import { useLeatherConnect } from '~/store/addresses';

import { type CoreToken, coreTokens, projects } from './apps.data';

const StyledLink = styled(Link);

const pillClassName = css({
  display: 'inline-flex',
  alignItems: 'center',
  height: '40px',
  px: 'space.04',
  border: 'default',
  borderRadius: '999px',
  textStyle: 'label.02',
  bg: 'ink.background-primary',
  _hover: { bg: 'ink.component-background-hover' },
});

function CoreTokenAction({ action, symbol }: Pick<CoreToken, 'action' | 'symbol'>) {
  const { setShowInstallLeatherDialog } = useLeatherConnect();
  if ('href' in action) {
    return (
      <styled.a
        href={action.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${action.label} ${symbol}`}
        className={pillClassName}
      >
        {action.label}
      </styled.a>
    );
  }
  return (
    <styled.button
      type="button"
      aria-label={`${action.label} ${symbol}`}
      onClick={() => setShowInstallLeatherDialog(true)}
      className={pillClassName}
    >
      {action.label}
    </styled.button>
  );
}

function CoreTokensSection() {
  return (
    <MarketingSection mt="space.07">
      <MarketingHeading mb="space.06">Core tokens</MarketingHeading>
      <Grid gridTemplateColumns={['1fr', 'repeat(2, 1fr)', null, 'repeat(4, 1fr)']} gap="space.03">
        {coreTokens.map(token => (
          <styled.article
            key={token.symbol}
            display="flex"
            flexDir="column"
            gap="space.05"
            p="space.05"
            bg="ink.background-secondary"
            borderRadius="sm"
          >
            <Flex alignItems="center" justifyContent="space-between" gap="space.03">
              <Flex alignItems="center" gap="space.03">
                <styled.img src={token.icon} alt="" width="48px" height="48px" />
                <Box>
                  <styled.h3 textStyle="label.01">{token.symbol}</styled.h3>
                  {token.name && (
                    <styled.p textStyle="body.02" color="ink.text-subdued">
                      {token.name}
                    </styled.p>
                  )}
                </Box>
              </Flex>
              <CoreTokenAction action={token.action} symbol={token.symbol} />
            </Flex>
            <styled.p textStyle="body.02" color="ink.text-subdued">
              {token.description}
            </styled.p>
          </styled.article>
        ))}
      </Grid>
    </MarketingSection>
  );
}

function EarningSection() {
  return (
    <MarketingSection>
      <MarketingHeading mb="space.06">Earning on Stacks</MarketingHeading>
      <Grid gridTemplateColumns={['1fr', null, null, '2fr 1fr 1fr']} gap="space.03">
        <styled.a
          href={marketingLinks.dualStacking}
          target="_blank"
          rel="noopener noreferrer"
          display="flex"
          flexDir="column"
          justifyContent="space-between"
          border="default"
          borderRadius="sm"
          overflow="hidden"
        >
          <Box p="space.05">
            <styled.h3 textStyle="heading.05">Dual stacking</styled.h3>
            <styled.p textStyle="label.01" mt="space.04">
              Up to 5% APY in sBTC
            </styled.p>
            <styled.p textStyle="body.02" color="ink.text-subdued" mt="space.01">
              Hold sBTC & boost with STX Stacking or DeFi
            </styled.p>
            <styled.span
              display="inline-flex"
              mt="space.05"
              bg="ink.text-primary"
              color="ink.background-primary"
              borderRadius="999px"
              px="space.04"
              py="space.02"
              textStyle="label.02"
            >
              Start earning
            </styled.span>
          </Box>
          <styled.img
            src="/marketing/apps/dual-stacking.png"
            alt=""
            width="100%"
            maxWidth="414px"
            alignSelf="flex-end"
            loading="lazy"
          />
        </styled.a>
        {[pooledStakingGroup, liquidStakingGroup].map(group => (
          <StyledLink
            key={group.title}
            to="/staking"
            prefetch="intent"
            display="block"
            p="space.05"
            border="default"
            borderRadius="sm"
            _hover={{ bg: 'ink.component-background-hover' }}
          >
            <YieldProviders group={group} />
          </StyledLink>
        ))}
      </Grid>
    </MarketingSection>
  );
}

function ProjectsSection() {
  return (
    <MarketingSection>
      <MarketingHeading mb="space.06">Projects</MarketingHeading>
      <Grid
        gridTemplateColumns={['1fr', 'repeat(2, 1fr)', null, 'repeat(3, 1fr)']}
        gap={0}
        borderTop="default"
        borderLeft="default"
        borderRadius="sm"
      >
        {projects.map(project => (
          <StyledLink
            key={project.name}
            to={project.href}
            prefetch="intent"
            display="flex"
            flexDir="column"
            gap="space.03"
            p="space.05"
            borderRight="default"
            borderBottom="default"
            _hover={{ bg: 'ink.component-background-hover' }}
          >
            <styled.img
              src={project.logo}
              alt=""
              width="48px"
              height="48px"
              objectFit="cover"
              loading="lazy"
            />
            <styled.h3 textStyle="label.01">{project.name}</styled.h3>
            <styled.p textStyle="caption.01" color="ink.text-subdued" lineClamp={2}>
              {project.description}
            </styled.p>
          </StyledLink>
        ))}
      </Grid>
    </MarketingSection>
  );
}

interface AppsPageProps {
  changelogEntries: ChangelogStripEntry[];
}

export function AppsPage({ changelogEntries }: AppsPageProps) {
  return (
    <Page>
      <Page.Header title="Explore" />
      <Box pb="space.10">
        <CoreTokensSection />
        <EarningSection />
        <MarketingSection>
          <MarketingHeading mb="space.06">Featured apps</MarketingHeading>
          <FeaturedAppsCarousel apps={appsPageFeaturedApps} />
        </MarketingSection>
        <ProjectsSection />
        <ChangelogStrip entries={changelogEntries} />
      </Box>
    </Page>
  );
}
