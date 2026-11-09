import { Grid, styled } from 'leather-styles/jsx';
import { FeatureCard } from '~/components/marketing/feature-card';
import { LottieAnimation } from '~/components/marketing/lottie-animation';
import { MarketingHeading } from '~/components/marketing/marketing-heading';
import { marketingAsset } from '~/content/marketing-content';

export function FullControlSection() {
  return (
    <styled.section>
      <MarketingHeading>
        Full control,
        <br />
        no compromise.
      </MarketingHeading>
      <Grid mt="space.07" gridTemplateColumns={['1fr', null, '1fr 1fr']} gap="space.03">
        <FeatureCard
          title="Send and receive"
          description="Transfer Bitcoin, tokens, and collectibles securely and instantly, with clear transaction details every step of the way."
          media={
            <LottieAnimation
              src={marketingAsset('lottie/send-receive.lottie.json')}
              width={580}
              height={432}
            />
          }
        />
        <FeatureCard
          title="Your collection, beautifully organised"
          badge="Mobile"
          description="See all your tokens and stacks collectibles at a glance, designed for clarity and a clean visual experience."
          media={
            <LottieAnimation
              src={marketingAsset('lottie/collection.lottie.json')}
              width={580}
              height={432}
            />
          }
        />
      </Grid>
      <Grid mt="space.03" gridTemplateColumns={['1fr', null, 'repeat(3, 1fr)']} gap="space.03">
        <FeatureCard
          title="Send sBTC without fees"
          description="Transfer securely and instantly, with clear review step at every transaction."
          media={
            <styled.img
              src={marketingAsset('images/feature-sbtc-no-fees.svg')}
              alt=""
              width="100%"
              loading="lazy"
              style={{ aspectRatio: '390 / 280' }}
            />
          }
        />
        <FeatureCard
          title="Know every move"
          description="Review your past transactions with full transparency and detail."
          media={
            <styled.img
              src={marketingAsset('images/feature-know-every-move.svg')}
              alt=""
              width="100%"
              loading="lazy"
              style={{ aspectRatio: '390 / 280' }}
            />
          }
        />
        <FeatureCard
          title="Get BTC notifications"
          badge="Extension"
          description="Get instant notification every time you receive Bitcoin in your wallet."
          media={
            <LottieAnimation
              src={marketingAsset('lottie/btc-notifications.lottie.json')}
              width={383}
              height={280}
            />
          }
        />
      </Grid>
    </styled.section>
  );
}
