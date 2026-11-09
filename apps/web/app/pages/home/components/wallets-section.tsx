import { Grid, styled } from 'leather-styles/jsx';
import { FeatureCard } from '~/components/marketing/feature-card';
import { LottieAnimation } from '~/components/marketing/lottie-animation';
import { MarketingHeading } from '~/components/marketing/marketing-heading';
import { marketingAsset } from '~/content/marketing-content';

export function WalletsSection() {
  return (
    <styled.section>
      <MarketingHeading>
        All your wallets,
        <br />
        perfectly organized.
      </MarketingHeading>
      <Grid mt="space.07" gridTemplateColumns={['1fr', null, '1fr 1fr']} gap="space.03">
        <FeatureCard
          title="Bring all your wallets"
          badge="Mobile"
          description="Create or restore wallets in seconds, keeping all your Bitcoin and Stacks accounts in one secure place."
          media={
            <LottieAnimation
              src={marketingAsset('lottie/bring-wallets.lottie.json')}
              width={580}
              height={432}
            />
          }
        />
        <FeatureCard
          title="Name it your way"
          badge="Mobile"
          description="Personalize your wallets with custom names to stay organized and instantly recognize the accounts that matter most."
          media={
            <LottieAnimation
              src={marketingAsset('lottie/name-wallets.lottie.json')}
              width={580}
              height={432}
            />
          }
        />
      </Grid>
    </styled.section>
  );
}
