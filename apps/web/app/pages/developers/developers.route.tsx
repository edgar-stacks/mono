import { Link } from 'react-router';

import { Box, Grid, styled } from 'leather-styles/jsx';
import { HelpCards } from '~/features/marketing/help-cards';
import { MarketingHeading } from '~/features/marketing/section-heading';
import { Page } from '~/layouts/page/page';
import { marketingHeaders } from '~/pages/seo/cache-control';
import { marketingMeta } from '~/pages/seo/marketing-meta';

const StyledLink = styled(Link);

const developerGuides = [
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

export function meta() {
  return marketingMeta({
    title: 'Developers – Leather',
    path: '/developers',
    description:
      'Quick-start guides and API references for building on Bitcoin and Stacks with Leather.',
  });
}

export function headers() {
  return marketingHeaders();
}

export default function DevelopersRoute() {
  return (
    <Page>
      <Page.Header title="Developers" />
      <Grid
        gridTemplateColumns={['1fr', null, '1fr 1fr']}
        gap={['space.05', null, 'space.08']}
        mt="space.07"
      >
        <MarketingHeading as="h1">{'Everything you need\nto start building'}</MarketingHeading>
        <styled.p textStyle="label.02" fontWeight={400}>
          Whether you're just getting started or you're deep into development, you'll find
          everything you need right here. From quick-start guides to in-depth API references, this
          space is designed to help you ship faster and smarter.
        </styled.p>
      </Grid>
      <Box bg="black" mt="space.07" mx={['-space.04', null, 0]}>
        <styled.img
          src="/marketing/developers/banner.png"
          alt=""
          width="100%"
          aspectRatio="5772 / 1032"
          objectFit="contain"
        />
      </Box>
      <Box py="space.09">
        <styled.h2 textStyle="heading.04" mb="space.06">
          Start developing with Leather
        </styled.h2>
        <styled.ul display="flex" flexDir="column" gap="space.04">
          {developerGuides.map(guide => (
            <li key={guide.slug}>
              <StyledLink
                to={`/posts/${guide.slug}`}
                prefetch="intent"
                textStyle="label.02"
                _hover={{ textDecoration: 'underline' }}
              >
                {guide.title}
              </StyledLink>
            </li>
          ))}
        </styled.ul>
      </Box>
      <Box mb="space.10">
        <HelpCards />
      </Box>
    </Page>
  );
}
