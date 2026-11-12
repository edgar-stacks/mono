import { type ReactNode, useState } from 'react';

import { Box, Flex, Grid, styled } from 'leather-styles/jsx';
import { CheckList } from '~/features/marketing/check-list';
import { FeatureCard } from '~/features/marketing/feature-card';
import { LottieAnimation } from '~/features/marketing/lottie-animation';
import { marketingLinks } from '~/features/marketing/marketing-links';
import { MarketingHeading, MarketingSection } from '~/features/marketing/section-heading';
import { SplineScene } from '~/features/marketing/spline-scene';

const sendAndReceiveSegment: [number, number] = [0, 665];
const spamFreeIdleSegment: [number, number] = [0, 175];
const spamFreeActiveSegment: [number, number] = [200, 300];

export function DecentralizedSwapsSection() {
  return (
    <MarketingSection>
      <Grid gridTemplateColumns={['1fr', null, '1fr 1fr']} gap="space.07" alignItems="center">
        <Box>
          <MarketingHeading>{'Decentralized\nswaps.'}</MarketingHeading>
          <styled.p textStyle="body.01" color="ink.text-subdued" mt="space.05" maxWidth="460px">
            Swap over 100 tokens. Instantly, privately, and with full control. No accounts. No
            middlemen. No limits.
          </styled.p>
          <CheckList
            items={['Bitflow', 'Velar', 'sBTC Bridge', 'ALEX']}
            flexWrap="wrap"
            columnGap="space.05"
            mt="space.05"
          />
        </Box>
        <SplineScene
          scene="/marketing/spline/coin-ring.splinecode"
          poster="/marketing/posters/coin-ring.png"
          aspectRatio="4 / 3"
        />
      </Grid>
    </MarketingSection>
  );
}

export function LedgerSection() {
  return (
    <MarketingSection>
      <Grid gridTemplateColumns={['1fr', null, '1fr 1fr']} gap="space.07" alignItems="center">
        <LottieAnimation
          src="/marketing/lottie/ledger.lottie.json"
          poster="/marketing/posters/ledger.png"
          posterAlt="A Ledger Nano plugged in"
          loop={false}
          replayOnEnter
          aspectRatio="680 / 374"
        />
        <Box>
          <MarketingHeading>{'Best in class\nLedger support.'}</MarketingHeading>
          <styled.p textStyle="body.01" color="ink.text-subdued" mt="space.05" maxWidth="460px">
            Create or restore wallets in seconds, keeping all your Bitcoin and Stacks accounts in
            one secure place.
          </styled.p>
          <CheckList
            items={[
              'Smart signing for a safer Ledger experience',
              'Seamless multi-chain BTC & STX experience',
              'Connect once and sign smoothly',
            ]}
            flexDir="column"
            mt="space.05"
          />
        </Box>
      </Grid>
    </MarketingSection>
  );
}

export function WalletsSection() {
  return (
    <MarketingSection>
      <MarketingHeading mb="space.06">{'All your wallets,\nperfectly organized.'}</MarketingHeading>
      <Grid gridTemplateColumns={['1fr', null, '1fr 1fr']} gap="space.03">
        <FeatureCard
          title="Bring all your wallets"
          platform="Mobile"
          description="Create or restore wallets in seconds, keeping all your Bitcoin and Stacks accounts in one secure place."
          media={
            <LottieAnimation
              src="/marketing/lottie/bring-all-your-wallets.lottie.json"
              poster="/marketing/posters/bring-all-your-wallets.png"
              aspectRatio="580 / 432"
            />
          }
        />
        <FeatureCard
          title="Name it your way"
          platform="Mobile"
          description="Personalize your wallets with custom names to stay organized and instantly recognize the accounts that matter most."
          media={
            <LottieAnimation
              src="/marketing/lottie/name-it-your-way.lottie.json"
              poster="/marketing/posters/name-it-your-way.png"
              aspectRatio="580 / 432"
            />
          }
        />
      </Grid>
    </MarketingSection>
  );
}

export function FullControlSection() {
  return (
    <MarketingSection>
      <MarketingHeading mb="space.06">{'Full control,\nno compromise.'}</MarketingHeading>
      <Grid gridTemplateColumns={['1fr', null, '1fr 1fr']} gap="space.03">
        <FeatureCard
          title="Send and receive"
          description="Transfer Bitcoin, tokens, and collectibles securely and instantly, with clear transaction details every step of the way."
          media={
            <LottieAnimation
              src="/marketing/lottie/send-and-receive.lottie.json"
              poster="/marketing/posters/send-and-receive.png"
              segment={sendAndReceiveSegment}
              aspectRatio="580 / 432"
            />
          }
        />
        <FeatureCard
          title="Your collection, beautifully organised"
          platform="Mobile"
          description="See all your tokens and stacks collectibles at a glance, designed for clarity and a clean visual experience."
          media={
            <LottieAnimation
              src="/marketing/lottie/your-collection.lottie.json"
              poster="/marketing/posters/your-collection.png"
              aspectRatio="580 / 432"
            />
          }
        />
      </Grid>
      <Grid gridTemplateColumns={['1fr', null, 'repeat(3, 1fr)']} gap="space.03" mt="space.03">
        <FeatureCard
          title="Send sBTC without fees"
          description="Transfer securely and instantly, with clear review step at every transaction."
          media={
            <styled.img
              src="/marketing/home/send-sbtc-without-fees.svg"
              alt="An sBTC transfer sponsored with no transaction fees"
              width="100%"
              aspectRatio="390 / 280"
              loading="lazy"
            />
          }
        />
        <FeatureCard
          title="Know every move"
          description="Review your past transactions with full transparency and detail."
          media={
            <styled.img
              src="/marketing/home/know-every-move.svg"
              alt="A list of sent and received transactions"
              width="100%"
              aspectRatio="390 / 280"
              loading="lazy"
            />
          }
        />
        <FeatureCard
          title="Get BTC notifications"
          platform="Extension"
          description="Get instant notification every time you receive Bitcoin in your wallet."
          media={
            <LottieAnimation
              src="/marketing/lottie/btc-notifications.lottie.json"
              poster="/marketing/posters/btc-notifications.png"
              aspectRatio="383 / 280"
            />
          }
        />
      </Grid>
    </MarketingSection>
  );
}

function SpamFreeCard() {
  const [isHidingSpam, setIsHidingSpam] = useState(false);

  return (
    <FeatureCard
      title="Stay spam free"
      platform="Extension"
      description="Filter unwanted tokens and collectibles, keeping your wallet clean and safe."
      media={
        <LottieAnimation
          src="/marketing/lottie/stay-spam-free.lottie.json"
          poster="/marketing/posters/stay-spam-free.png"
          segment={isHidingSpam ? spamFreeActiveSegment : spamFreeIdleSegment}
          loop={!isHidingSpam}
          aspectRatio="390 / 280"
        />
      }
      action={
        <styled.button
          type="button"
          aria-pressed={isHidingSpam}
          aria-label="Hide spam"
          onClick={() => setIsHidingSpam(isHiding => !isHiding)}
          position="absolute"
          inset={0}
          cursor="pointer"
          _focusVisible={{ outline: '2px solid', outlineColor: 'ink.border-selected' }}
        />
      }
    />
  );
}

export function ProtectionSection() {
  return (
    <MarketingSection>
      <MarketingHeading mb="space.06">{'Protection\nat every step.'}</MarketingHeading>
      <Grid gridTemplateColumns={['1fr', null, 'repeat(3, 1fr)']} gap="space.03">
        <SpamFreeCard />
        <FeatureCard
          title="Review transactions"
          description="Transfer securely and instantly, with clear review step at every transaction."
          media={
            <LottieAnimation
              src="/marketing/lottie/review-transactions.lottie.json"
              poster="/marketing/posters/review-transactions.png"
              aspectRatio="530 / 380"
            />
          }
        />
        <FeatureCard
          title="UTXO protection"
          platform="Extension"
          description="Prevent accidental misuse of Ordinal Inscriptions with UTXO safeguards."
          media={
            <styled.img
              src="/marketing/home/utxo-protection.png"
              alt="A locked collectible protected from being spent"
              width="100%"
              aspectRatio="390 / 280"
              objectFit="contain"
              loading="lazy"
            />
          }
        />
      </Grid>
    </MarketingSection>
  );
}

interface TrustItem {
  title: string;
  description: string;
  href: string;
  logo: ReactNode;
}

const trustItems: TrustItem[] = [
  {
    title: 'Open source by design',
    description:
      'Transparent by design. Community-tested and reviewed to ensure the highest level of safety.',
    href: marketingLinks.github,
    logo: (
      <styled.span textStyle="heading.04" fontWeight={700} color="black">
        GitHub
      </styled.span>
    ),
  },
  {
    title: 'Audited by Least Authority',
    description: 'Reviewed by one of the most respected security firms in the crypto industry.',
    href: marketingLinks.leastAuthorityAudit,
    logo: (
      <styled.img src="/marketing/home/least-authority.png" alt="Least Authority" height="56px" />
    ),
  },
  {
    title: 'Field tested by hackerone.com',
    description:
      'Validated by ethical hackers who continuously identify and resolve vulnerabilities.',
    href: marketingLinks.hackerOne,
    logo: <styled.img src="/marketing/home/hackerone.png" alt="HackerOne" height="32px" />,
  },
];

export function TrustSection() {
  return (
    <MarketingSection>
      <MarketingHeading mb="space.06">{'Built on trust.\nSafety by design.'}</MarketingHeading>
      <Grid
        gridTemplateColumns={['1fr', null, 'repeat(3, 1fr)']}
        gap={0}
        border="default"
        borderRadius="sm"
      >
        {trustItems.map(item => (
          <Flex
            key={item.title}
            flexDir="column"
            gap="space.05"
            p="space.05"
            borderRight={[null, null, 'default']}
            borderBottom={['default', null, 'none']}
            _last={{ borderRight: 'none', borderBottom: 'none' }}
          >
            <Box>
              <styled.h3 textStyle="heading.05">{item.title}</styled.h3>
              <styled.p textStyle="body.02" color="ink.text-subdued" mt="space.02">
                {item.description}
              </styled.p>
            </Box>
            <styled.a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              alignSelf="flex-start"
              textStyle="label.02"
              borderBottom="1px solid"
              borderColor="ink.border-default"
              _hover={{ borderColor: 'ink.action-primary-hover' }}
            >
              Learn more ↗
            </styled.a>
            <Flex
              alignItems="center"
              justifyContent="center"
              bg="black"
              aspectRatio="334 / 192"
              mt="space.02"
            >
              <Flex
                alignItems="center"
                justifyContent="center"
                bg="white"
                borderRadius="sm"
                px="space.05"
                py="space.04"
              >
                {item.logo}
              </Flex>
            </Flex>
          </Flex>
        ))}
      </Grid>
    </MarketingSection>
  );
}
