import { Link } from 'react-router';

import { Flex, Grid, VStack, styled } from 'leather-styles/jsx';
import { ChangelogStrip } from '~/features/marketing/changelog-strip';
import { LottieAnimation } from '~/features/marketing/lottie-animation';
import {
  CardGrid,
  DownloadButtons,
  FeatureCard,
  MarketingImage,
  MarketingSection,
  WordTicker,
  YieldHighlight,
  YieldProviderList,
} from '~/features/marketing/marketing-components';
import {
  liquidStakingProviders,
  marketingAssetPath,
  pooledStakingProviders,
  sbtcProviders,
} from '~/features/marketing/marketing-data';
import { type ChangelogHighlight } from '~/features/marketing/marketing.queries';
import { SpamFreeToggle } from '~/features/marketing/spam-free-toggle';
import { SplineScene } from '~/features/marketing/spline-scene';
import { Page } from '~/layouts/page/page';

const heroWords = ['Buy.', 'send.', 'swap.', 'earn.', 'grow.'];
const swapPartners = ['Bitflow', 'Velar', 'sBTC Bridge', 'ALEX'];
const ledgerHighlights = [
  'Smart signing for a safer Ledger experience',
  'Seamless multi-chain BTC & STX experience',
  'Connect once and sign smoothly',
];

const trustItems = [
  {
    title: 'Open source by design',
    description:
      'Transparent by design. Community-tested and reviewed to ensure the highest level of safety.',
    href: 'https://github.com/leather-io',
  },
  {
    title: 'Audited by Least Authority',
    description: 'Reviewed by one of the most respected security firms in the crypto industry.',
    href: 'https://leastauthority.com/blog/audit-of-hiros-stacks-wallet/',
    logo: `${marketingAssetPath}/images/logo-least-authority.png`,
  },
  {
    title: 'Field tested by hackerone.com',
    description:
      'Validated by ethical hackers who continuously identify and resolve vulnerabilities.',
    href: 'https://hackerone.com/leather_wallet',
    logo: `${marketingAssetPath}/images/logo-hackerone.png`,
  },
];

function lottie(name: string) {
  return {
    src: `${marketingAssetPath}/lottie/${name}.json`,
    poster: `${marketingAssetPath}/posters/${name}.png`,
  };
}

function HomeHero() {
  return (
    <Grid
      gridTemplateColumns={['1fr', '1fr', '1fr', '5fr 7fr']}
      gap="space.07"
      alignItems="center"
      pt="space.05"
      pb="space.08"
    >
      <VStack alignItems="flex-start" gap="space.05">
        <styled.h1 textStyle="display.01" animation="marketingFadeUp 0.6s ease-out both">
          <WordTicker words={heroWords} />
        </styled.h1>
        <styled.p textStyle="body.01" color="ink.text-subdued" maxWidth="440px">
          Leather is a wallet for Bitcoin and Stacks, designed for security, clarity, and growth.
          Join 100,000+ users on your favorite platform.
        </styled.p>
        <DownloadButtons />
      </VStack>
      <styled.picture display="block">
        <source media="(min-width: 768px)" srcSet={`${marketingAssetPath}/images/hero-l.png`} />
        <styled.img
          src={`${marketingAssetPath}/images/hero-s.png`}
          alt="Leather wallet on desktop and mobile showing a total balance of Bitcoin, Stacks and sBTC"
          width="100%"
          height="auto"
          fetchPriority="high"
        />
      </styled.picture>
    </Grid>
  );
}

function ScamNotice() {
  return (
    <styled.p
      role="note"
      textStyle="label.02"
      bg="ink.background-secondary"
      borderRadius="sm"
      px="space.04"
      py="space.03"
      mt="space.04"
    >
      There is an active email phishing 2FA scam. Leather will never send you an email. Do not click
      any links.
    </styled.p>
  );
}

function SwapsSection() {
  return (
    <MarketingSection>
      <Grid gridTemplateColumns={['1fr', '1fr', '1fr 1fr']} gap="space.07" alignItems="center">
        <VStack alignItems="flex-start" gap="space.04">
          <styled.h2 textStyle="heading.02">
            Decentralized
            <br />
            Swaps.
          </styled.h2>
          <styled.p textStyle="body.01" color="ink.text-subdued">
            Swap over 100 tokens. Instantly, privately, and with full control. No accounts. No
            middlemen. No limits.
          </styled.p>
          <Flex as="ul" gap="space.03" flexWrap="wrap">
            {swapPartners.map(partner => (
              <styled.li
                key={partner}
                textStyle="label.02"
                border="default"
                borderRadius="round"
                px="space.04"
                py="space.02"
              >
                {partner}
              </styled.li>
            ))}
          </Flex>
        </VStack>
        <SplineScene
          scene={`${marketingAssetPath}/spline/swaps-coins.splinecode`}
          poster={`${marketingAssetPath}/posters/swaps-coins.png`}
          alt="Bitcoin and Stacks coins"
          width={600}
          height={600}
          maxWidth="480px"
          mx="auto"
        />
      </Grid>
    </MarketingSection>
  );
}

function LedgerSection() {
  return (
    <MarketingSection>
      <Grid gridTemplateColumns={['1fr', '1fr', '1fr 1fr']} gap="space.07" alignItems="center">
        <VStack alignItems="flex-start" gap="space.04">
          <styled.h2 textStyle="heading.02">
            Best in class
            <br />
            Ledger support.
          </styled.h2>
          <styled.p textStyle="body.01" color="ink.text-subdued">
            Create or restore wallets in seconds, keeping all your Bitcoin and Stacks accounts in
            one secure place.
          </styled.p>
          <VStack as="ul" alignItems="flex-start" gap="space.02">
            {ledgerHighlights.map(highlight => (
              <styled.li key={highlight} textStyle="label.02">
                {highlight}
              </styled.li>
            ))}
          </VStack>
        </VStack>
        <LottieAnimation
          {...lottie('ledger')}
          alt="Ledger Nano connected to Leather"
          width={680}
          height={374}
          playback="once-per-view"
        />
      </Grid>
    </MarketingSection>
  );
}

function WalletsSection() {
  return (
    <MarketingSection
      title={
        <>
          All your wallets,
          <br />
          perfectly organized.
        </>
      }
    >
      <CardGrid columns={2}>
        <FeatureCard
          title="Bring all your wallets"
          platform="Mobile"
          description="Create or restore wallets in seconds, keeping all your Bitcoin and Stacks accounts in one secure place."
          visual={
            <LottieAnimation
              {...lottie('bring-wallets')}
              alt="Wallets being added to Leather"
              width={580}
              height={432}
            />
          }
        />
        <FeatureCard
          title="Name it your way"
          platform="Mobile"
          description="Personalize your wallets with custom names to stay organized and instantly recognize the accounts that matter most."
          visual={
            <LottieAnimation
              {...lottie('name-wallets')}
              alt="A wallet being renamed"
              width={580}
              height={432}
            />
          }
        />
      </CardGrid>
    </MarketingSection>
  );
}

function ControlSection() {
  return (
    <MarketingSection
      title={
        <>
          Full control,
          <br />
          no compromise.
        </>
      }
    >
      <VStack alignItems="stretch" gap="space.04">
        <CardGrid columns={2}>
          <FeatureCard
            title="Send and receive"
            description="Transfer Bitcoin, tokens, and collectibles securely and instantly, with clear transaction details every step of the way."
            visual={
              <LottieAnimation
                {...lottie('send-receive')}
                alt="Choosing a recipient to send STX"
                width={580}
                height={432}
              />
            }
          />
          <FeatureCard
            title="Your collection, beautifully organised"
            platform="Mobile"
            description="See all your tokens and stacks collectibles at a glance, designed for clarity and a clean visual experience."
            visual={
              <LottieAnimation
                {...lottie('collection')}
                alt="A grid of collectibles"
                width={580}
                height={432}
              />
            }
          />
        </CardGrid>
        <CardGrid columns={3}>
          <FeatureCard
            title="Send sBTC without fees"
            description="Transfer securely and instantly, with clear review step at every transaction."
            visual={
              <MarketingImage
                src={`${marketingAssetPath}/images/feature-send-sbtc.svg`}
                alt="Sending 0.1 sBTC with sponsored, zero transaction fees"
              />
            }
          />
          <FeatureCard
            title="Know every move"
            description="Review your past transactions with full transparency and detail."
            visual={
              <MarketingImage
                src={`${marketingAssetPath}/images/feature-activity.svg`}
                alt="Recent Bitcoin, Stacks and sBTC activity"
              />
            }
          />
          <FeatureCard
            title="Get BTC notifications"
            platform="Extension"
            description="Get instant notification every time you receive Bitcoin in your wallet."
            visual={
              <LottieAnimation
                {...lottie('btc-notifications')}
                alt="Notifications for received Bitcoin"
                width={383}
                height={280}
              />
            }
          />
        </CardGrid>
      </VStack>
    </MarketingSection>
  );
}

function ProtectionSection() {
  return (
    <MarketingSection title="Protection at every step.">
      <CardGrid columns={3}>
        <FeatureCard
          title="Stay spam free"
          platform="Extension"
          description="Filter unwanted tokens and collectibles, keeping your wallet clean and safe."
          visual={<SpamFreeToggle />}
        />
        <FeatureCard
          title="Review transactions"
          description="Transfer securely and instantly, with clear review step at every transaction."
          visual={
            <LottieAnimation
              {...lottie('review-transactions')}
              alt="Reviewing a contract call before approving it"
              width={530}
              height={380}
            />
          }
        />
        <FeatureCard
          title="UTXO protection"
          platform="Extension"
          description="Prevent accidental misuse of Ordinal Inscriptions with UTXO safeguards."
          visual={
            <MarketingImage
              src={`${marketingAssetPath}/images/feature-utxo-protection.png`}
              alt="A locked inscription"
            />
          }
        />
      </CardGrid>
    </MarketingSection>
  );
}

function TrustSection() {
  return (
    <MarketingSection
      title={
        <>
          Built on trust.
          <br />
          Safety by design.
        </>
      }
    >
      <CardGrid columns={3}>
        {trustItems.map(item => (
          <VStack
            key={item.title}
            alignItems="flex-start"
            gap="space.03"
            p="space.05"
            borderRadius="md"
            border="default"
          >
            {item.logo && <MarketingImage src={item.logo} alt="" height="28px" width="auto" />}
            <styled.h3 textStyle="heading.05">{item.title}</styled.h3>
            <styled.p textStyle="body.02" color="ink.text-subdued">
              {item.description}
            </styled.p>
            <styled.a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              textStyle="label.02"
              textDecoration="underline"
            >
              Learn more ↗
            </styled.a>
          </VStack>
        ))}
      </CardGrid>
    </MarketingSection>
  );
}

function ProvidersSection() {
  return (
    <MarketingSection
      title={
        <>
          The best providers,
          <br />
          in one place.
        </>
      }
      description="We’ve aggregated the best for you, so your assets work harder with full transparency and steady yields over time."
    >
      <CardGrid columns={2}>
        <Link to="/sbtc" prefetch="intent">
          <VStack
            alignItems="flex-start"
            gap="space.05"
            p="space.05"
            height="100%"
            borderRadius="md"
            border="default"
            _hover={{ bg: 'ink.component-background-hover' }}
          >
            <Flex justifyContent="space-between" width="100%" alignItems="flex-start">
              <VStack alignItems="flex-start" gap="space.01">
                <styled.h3 textStyle="heading.04">sBTC</styled.h3>
                <styled.span textStyle="label.02" color="ink.text-subdued">
                  Earn BTC
                </styled.span>
              </VStack>
              <YieldHighlight value="5%" label={'Based on avg. past\nyearly rewards'} />
            </Flex>
            <VStack alignItems="flex-start" gap="space.02">
              <styled.h4 textStyle="label.01">Bitcoin on layer 2</styled.h4>
              <styled.p textStyle="body.02" color="ink.text-subdued">
                Turn your Bitcoin into an active asset. Earn rewards, use it in DeFi, and explore
                new ways to grow your BTC on layer 2.
              </styled.p>
            </VStack>
            <YieldProviderList providers={sbtcProviders} />
          </VStack>
        </Link>
        <Link to="/staking" prefetch="intent">
          <VStack
            alignItems="flex-start"
            gap="space.05"
            p="space.05"
            height="100%"
            borderRadius="md"
            border="default"
            _hover={{ bg: 'ink.component-background-hover' }}
          >
            <Flex justifyContent="space-between" width="100%" alignItems="flex-start">
              <VStack alignItems="flex-start" gap="space.01">
                <styled.h3 textStyle="heading.04">Staking</styled.h3>
                <styled.span textStyle="label.02" color="ink.text-subdued">
                  Start Staking
                </styled.span>
              </VStack>
              <YieldHighlight value="6–10%" label={'Based on avg. past\nyearly rewards'} />
            </Flex>
            <VStack alignItems="flex-start" gap="space.02">
              <styled.h4 textStyle="label.01">Pooled staking</styled.h4>
              <styled.p textStyle="body.02" color="ink.text-subdued">
                Stake with others to earn BTC. Your STX stay locked for each cycle, and you earn
                steady rewards.
              </styled.p>
            </VStack>
            <YieldProviderList providers={pooledStakingProviders} />
            <VStack alignItems="flex-start" gap="space.02">
              <styled.h4 textStyle="label.01">Liquid Staking</styled.h4>
              <styled.p textStyle="body.02" color="ink.text-subdued">
                Keep your STX flexible and still earn BTC. Get a liquid token that lets you trade or
                use your staked STX anytime.
              </styled.p>
            </VStack>
            <YieldProviderList providers={liquidStakingProviders} />
          </VStack>
        </Link>
      </CardGrid>
    </MarketingSection>
  );
}

interface HomePageProps {
  changelogEntries: ChangelogHighlight[];
}

export function HomePage({ changelogEntries }: HomePageProps) {
  return (
    <Page>
      <Page.Header />
      <ScamNotice />
      <HomeHero />
      <MarketingSection
        title={
          <>
            Buy instantly through
            <br />
            trusted partners.
          </>
        }
      />
      <SwapsSection />
      <LedgerSection />
      <WalletsSection />
      <ControlSection />
      <ProtectionSection />
      <TrustSection />
      <ProvidersSection />
      <ChangelogStrip entries={changelogEntries} />
    </Page>
  );
}
