import { Box, Grid, styled } from 'leather-styles/jsx';
import { CheckList } from '~/components/marketing/check-list';
import { MarketingHeading } from '~/components/marketing/marketing-heading';
import { SplineScene } from '~/components/marketing/spline-scene';
import { marketingAsset, swapProviders } from '~/content/marketing-content';

export function SwapsSection() {
  return (
    <Grid
      as="section"
      gridTemplateColumns={['1fr', null, '1fr 1fr']}
      gap="space.07"
      alignItems="center"
    >
      <Box>
        <MarketingHeading>
          Decentralized
          <br />
          Swaps.
        </MarketingHeading>
        <styled.p mt="space.05" textStyle="body.01" color="ink.text-subdued" maxWidth="460px">
          Swap over 100 tokens. Instantly, privately, and with full control. No accounts. No
          middlemen. No limits.
        </styled.p>
        <Box mt="space.05">
          <CheckList items={swapProviders} direction="row" />
        </Box>
      </Box>
      <SplineScene scene={marketingAsset('spline/coin-ring.splinecode')} width={600} height={420} />
    </Grid>
  );
}
