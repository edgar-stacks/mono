import { useCallback, useEffect, useState } from 'react';

import { Box, Grid, styled } from 'leather-styles/jsx';
import type { AnimationItem } from 'lottie-web';
import { FeatureCard } from '~/components/marketing/feature-card';
import { LottieAnimation } from '~/components/marketing/lottie-animation';
import { MarketingHeading } from '~/components/marketing/marketing-heading';
import { marketingAsset } from '~/content/marketing-content';

const forward = 1;
const backward = -1;

function SpamFilterDemo() {
  const [hideSpam, setHideSpam] = useState(false);
  const [animation, setAnimation] = useState<AnimationItem | null>(null);
  const onAnimationLoad = useCallback((item: AnimationItem) => {
    item.goToAndStop(0, true);
    setAnimation(item);
  }, []);

  useEffect(() => {
    if (!animation) return;
    animation.setDirection(hideSpam ? forward : backward);
    animation.play();
  }, [animation, hideSpam]);

  return (
    <Box position="relative">
      <LottieAnimation
        src={marketingAsset('lottie/spam-filter.lottie.json')}
        width={390}
        height={280}
        loop={false}
        autoplay={false}
        onAnimationLoad={onAnimationLoad}
      />
      <styled.button
        type="button"
        aria-pressed={hideSpam}
        onClick={() => setHideSpam(value => !value)}
        display="flex"
        alignItems="center"
        gap="space.02"
        mx="auto"
        mt="space.03"
        px="space.04"
        height="36px"
        borderRadius="round"
        border="default"
        textStyle="label.02"
        bg={hideSpam ? 'ink.text-primary' : 'ink.background-primary'}
        color={hideSpam ? 'ink.background-primary' : 'ink.text-primary'}
      >
        Hide spam
      </styled.button>
    </Box>
  );
}

export function ProtectionSection() {
  return (
    <styled.section>
      <MarketingHeading>
        Protection
        <br />
        at every step.
      </MarketingHeading>
      <Grid mt="space.07" gridTemplateColumns={['1fr', null, 'repeat(3, 1fr)']} gap="space.03">
        <FeatureCard
          title="Stay spam free"
          badge="Extension"
          description="Filter unwanted tokens and collectibles, keeping your wallet clean and safe."
          media={<SpamFilterDemo />}
        />
        <FeatureCard
          title="Review transactions"
          description="Transfer securely and instantly, with clear review step at every transaction."
          media={
            <LottieAnimation
              src={marketingAsset('lottie/review-transactions.lottie.json')}
              width={530}
              height={380}
            />
          }
        />
        <FeatureCard
          title="UTXO protection"
          badge="Extension"
          description="Prevent accidental misuse of Ordinal Inscriptions with UTXO safeguards."
          media={
            <styled.img
              src={marketingAsset('images/feature-utxo-protection.png')}
              alt=""
              width="100%"
              loading="lazy"
              style={{ aspectRatio: '780 / 560' }}
            />
          }
        />
      </Grid>
    </styled.section>
  );
}
