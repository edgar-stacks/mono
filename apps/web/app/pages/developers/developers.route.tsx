import { Link } from 'react-router';

import { Box, Flex, Grid, VStack, styled } from 'leather-styles/jsx';
import { MarketingHeading } from '~/components/marketing/marketing-heading';
import { developerPosts, helpLinks, marketingAsset } from '~/content/marketing-content';
import { Page } from '~/layouts/page/page';
import { getPostPath } from '~/pages/redirects/content-slug-resolver';
import { marketingCacheHeaders, marketingMeta } from '~/pages/seo/marketing-meta';

export function meta() {
  return marketingMeta({
    title: 'Developers',
    path: '/developers',
    description:
      'Everything you need to start building with Leather, from quick-start guides to in-depth API references.',
  });
}

export function headers() {
  return marketingCacheHeaders;
}

export default function DevelopersRoute() {
  return (
    <Page>
      <Page.Header title="Developers" />
      <Grid
        mt="space.07"
        gridTemplateColumns={['1fr', null, '1fr 1fr']}
        gap="space.06"
        alignItems="start"
      >
        <MarketingHeading>
          Everything you need
          <br />
          to start building
        </MarketingHeading>
        <styled.p textStyle="body.01">
          Whether you're just getting started or you're deep into development, you'll find
          everything you need right here. From quick-start guides to in-depth API references, this
          space is designed to help you ship faster and smarter.
        </styled.p>
      </Grid>
      <Box mt="space.07" bg="ink.text-primary" borderRadius="md" overflow="hidden">
        <styled.img
          src={marketingAsset('images/developers-hero.png')}
          alt=""
          width="100%"
          display="block"
          style={{ aspectRatio: '2048 / 366' }}
        />
      </Box>
      <styled.section mt="space.08">
        <styled.h2 textStyle="heading.04" fontWeight="normal">
          Start developing with Leather
        </styled.h2>
        <VStack as="ul" alignItems="flex-start" gap="space.03" mt="space.05">
          {developerPosts.map(post => (
            <styled.li key={post.slug} textStyle="label.02">
              <Link to={getPostPath(post.slug)}>{post.title}</Link>
            </styled.li>
          ))}
        </VStack>
      </styled.section>
      <Grid
        as="ul"
        my="space.09"
        gridTemplateColumns={['1fr', null, 'repeat(3, 1fr)']}
        gap={0}
        borderY="default"
      >
        {helpLinks.map(({ href, title, description, icon }) => (
          <styled.li
            key={href}
            borderRight={[null, null, 'default']}
            _last={{ borderRight: 'none' }}
          >
            <styled.a
              href={href}
              display="flex"
              flexDir="column"
              gap="space.02"
              height="100%"
              p="space.06"
              _hover={{ bg: 'ink.component-background-hover' }}
            >
              <Flex
                width="48px"
                height="48px"
                alignItems="center"
                justifyContent="center"
                bg="ink.background-secondary"
                mb="space.07"
              >
                <styled.img src={icon} alt="" width="24px" height="24px" />
              </Flex>
              <styled.span textStyle="heading.05">{title}</styled.span>
              <styled.span textStyle="caption.01" color="ink.text-subdued">
                {description}
              </styled.span>
            </styled.a>
          </styled.li>
        ))}
      </Grid>
    </Page>
  );
}
