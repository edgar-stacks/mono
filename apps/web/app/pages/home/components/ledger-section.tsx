import { Box, Grid, styled } from 'leather-styles/jsx';
import { CheckList } from '~/components/marketing/check-list';
import { LottieAnimation } from '~/components/marketing/lottie-animation';
import { MarketingHeading } from '~/components/marketing/marketing-heading';
import { ledgerFeatures, marketingAsset } from '~/content/marketing-content';

export function LedgerSection() {
  return (
    <Grid
      as="section"
      gridTemplateColumns={['1fr', null, '3fr 2fr']}
      gap="space.07"
      alignItems="center"
    >
      <LottieAnimation
        src={marketingAsset('lottie/ledger.lottie.json')}
        width={680}
        height={374}
        loop={false}
        order={[1, null, 0]}
      />
      <Box>
        <MarketingHeading>
          Best in class
          <br />
          Ledger support.
        </MarketingHeading>
        <styled.p mt="space.05" textStyle="body.01" color="ink.text-subdued">
          Create or restore wallets in seconds, keeping all your Bitcoin and Stacks accounts in one
          secure place.
        </styled.p>
        <Box mt="space.05">
          <CheckList items={ledgerFeatures} />
        </Box>
      </Box>
    </Grid>
  );
}
