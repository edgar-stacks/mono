import { Box, Grid, styled } from 'leather-styles/jsx';
import { MarketingHeading, MarketingSection } from '~/features/marketing/section-heading';
import { YieldCards } from '~/features/marketing/yield-cards';

export function ProvidersSection() {
  return (
    <MarketingSection>
      <Grid gridTemplateColumns={['1fr', null, null, '1fr 2fr']} gap="space.07" alignItems="end">
        <Box>
          <MarketingHeading>{'The best providers,\nin one place.'}</MarketingHeading>
          <styled.p textStyle="body.01" mt="space.04" maxWidth="340px">
            We’ve aggregated the best for you, so your assets work harder with full transparency and
            steady yields over time.
          </styled.p>
        </Box>
        <YieldCards />
      </Grid>
    </MarketingSection>
  );
}
