import { Link } from 'react-router';

import { css } from 'leather-styles/css';
import { Box, Flex, Grid, styled } from 'leather-styles/jsx';
import { Tabs } from 'radix-ui';
import { FeaturedAppsCarousel, explorerFeaturedApps } from '~/features/marketing/featured-apps';
import { MarketingHeading } from '~/features/marketing/section-heading';
import { type RouteChromeHandle } from '~/layouts/chrome/route-chrome';
import { marketingHeaders } from '~/pages/seo/cache-control';
import { marketingMeta } from '~/pages/seo/marketing-meta';

import { type ExplorerApp, explorerTabs } from './explorer.data';

const StyledLink = styled(Link);

const tabTriggerClassName = css({
  flex: 1,
  py: 'space.04',
  textStyle: 'label.01',
  fontWeight: 400,
  color: 'ink.text-subdued',
  borderBottom: '2px solid transparent',
  whiteSpace: 'nowrap',
  '&[data-state=active]': {
    color: 'ink.text-primary',
    borderColor: 'ink.text-primary',
  },
});

export const handle = { chrome: 'none' } satisfies RouteChromeHandle;

export function meta() {
  return marketingMeta({ title: 'Leather', path: '/explorer' });
}

export function headers() {
  return marketingHeaders();
}

interface ExplorerAppRowProps {
  app: ExplorerApp;
}

function ExplorerAppRow({ app }: ExplorerAppRowProps) {
  const isExternal = app.href.startsWith('https://');
  const content = (
    <>
      <Flex alignItems="center" gap="space.04">
        <styled.img
          src={app.icon}
          alt=""
          width="40px"
          height="40px"
          borderRadius="xs"
          loading="lazy"
        />
        <styled.span textStyle="label.02">{app.name}</styled.span>
      </Flex>
      <styled.span
        textStyle="label.03"
        bg="ink.background-secondary"
        borderRadius="999px"
        px="space.04"
        py="space.02"
      >
        Open
      </styled.span>
    </>
  );
  if (isExternal) {
    return (
      <styled.a
        href={app.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${app.name}`}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        py="space.04"
      >
        {content}
      </styled.a>
    );
  }
  return (
    <StyledLink
      to={app.href}
      aria-label={`Open ${app.name}`}
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      py="space.04"
    >
      {content}
    </StyledLink>
  );
}

export default function ExplorerRoute() {
  return (
    <Box maxWidth="720px" mx="auto" py="space.07">
      <Grid gridTemplateColumns="1fr auto" gap="space.04" alignItems="center" px="space.05">
        <Box>
          <MarketingHeading as="h1">{'Grow your\nBitcoin'}</MarketingHeading>
          <styled.p textStyle="label.01" fontWeight={400} mt="space.02">
            Up to 8% with direct wallet payouts
          </styled.p>
          <StyledLink
            to="/sbtc"
            display="inline-flex"
            mt="space.04"
            bg="ink.text-primary"
            color="ink.background-primary"
            borderRadius="999px"
            px="space.04"
            py="space.02"
            textStyle="label.02"
          >
            Get sBTC
          </StyledLink>
        </Box>
        <Box position="relative" width="128px" height="150px" aria-hidden>
          <styled.img
            src="/marketing/explorer/piggy-bank.png"
            alt=""
            position="absolute"
            top={0}
            left={0}
            width="96px"
            transform="rotate(16deg)"
            animation="marketingFloat 4s ease-in-out infinite"
            _motionReduce={{ animation: 'none' }}
          />
          <styled.img
            src="/marketing/explorer/hourglass.png"
            alt=""
            position="absolute"
            bottom={0}
            right={0}
            width="88px"
            transform="rotate(29deg)"
            animation="marketingFloat 5s ease-in-out 0.6s infinite"
            _motionReduce={{ animation: 'none' }}
          />
        </Box>
      </Grid>
      <Box mt="space.07" px="space.05">
        <FeaturedAppsCarousel apps={explorerFeaturedApps} compact />
      </Box>
      <Box mt="space.08" px="space.05">
        <MarketingHeading>{'More apps to\nearn in Stacks'}</MarketingHeading>
        <Tabs.Root defaultValue={explorerTabs[0]?.label}>
          <Tabs.List
            aria-label="App categories"
            className={css({ display: 'flex', borderBottom: 'default', mt: 'space.05' })}
          >
            {explorerTabs.map(tab => (
              <Tabs.Trigger key={tab.label} value={tab.label} className={tabTriggerClassName}>
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {explorerTabs.map(tab => (
            <Tabs.Content key={tab.label} value={tab.label}>
              <styled.ul>
                {tab.apps.map(app => (
                  <li key={app.name}>
                    <ExplorerAppRow app={app} />
                  </li>
                ))}
              </styled.ul>
            </Tabs.Content>
          ))}
        </Tabs.Root>
        <styled.p
          textStyle="caption.01"
          color="ink.text-subdued"
          borderTop="default"
          pt="space.05"
          mt="space.04"
        >
          Leather does not operate or manage any Stacking pools or liquid Stacking protocols. Users
          are responsible for evaluating the risks, terms, and smart contracts involved in any
          third-party options they access through Leather.
        </styled.p>
      </Box>
    </Box>
  );
}
