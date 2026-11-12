import { Box, Flex, Grid, styled } from 'leather-styles/jsx';
import { StoreButtons } from '~/features/marketing/store-buttons';

import { ErrorTriangleIcon } from '@leather.io/ui';

const heroWords = ['Buy.', 'send.', 'swap.', 'earn.', 'grow.'];

function PhishingNotice() {
  return (
    <Flex
      role="note"
      alignItems="center"
      gap="space.03"
      px="space.04"
      py="space.03"
      bg="ink.component-background-hover"
      textStyle="label.02"
    >
      <Box flex="none" display="flex">
        <ErrorTriangleIcon variant="small" />
      </Box>
      There is an active email phishing 2FA scam. Leather will never send you an email. Do not click
      any links.
    </Flex>
  );
}

export function HomeHero() {
  return (
    <Box>
      <PhishingNotice />
      <Grid
        gridTemplateColumns={['1fr', null, '1fr 1fr']}
        gap={['space.06', null, 'space.08']}
        alignItems="start"
        mt={['space.07', null, 'space.08']}
      >
        <styled.h1
          textStyle="display.02"
          fontSize={['3rem', '3.5rem', '4rem']}
          lineHeight={['2.75rem', '3.25rem', '3.5rem']}
          letterSpacing="-0.02em"
        >
          {heroWords.map((word, index) => (
            <styled.span
              key={word}
              display="inline-block"
              mr="0.25em"
              animation="marketingRise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both"
              style={{ animationDelay: `${index * 90}ms` }}
              _motionReduce={{ animation: 'none' }}
            >
              {word}
            </styled.span>
          ))}
        </styled.h1>
        <Box>
          <styled.p textStyle="heading.05" fontWeight={400} maxWidth="540px" mb="space.05">
            Leather is a wallet for Bitcoin and Stacks, designed for security, clarity, and growth.
            Join 100,000+ users on your favorite platform.
          </styled.p>
          <StoreButtons />
        </Box>
      </Grid>
      <Box
        mt={['space.07', null, 'space.09']}
        bg="ink.background-secondary"
        borderRadius="sm"
        overflow="hidden"
        px={['space.05', null, 'space.08']}
        pt={['space.07', null, 'space.08']}
      >
        <picture>
          <source media="(min-width: 768px)" srcSet="/marketing/home/hero-devices.png" />
          <styled.img
            src="/marketing/home/hero-mobile.png"
            alt="Leather on desktop and mobile showing a wallet balance and tokens"
            width="100%"
            maxWidth={['320px', null, '100%']}
            mx="auto"
            display="block"
            fetchPriority="high"
          />
        </picture>
      </Box>
      <Flex
        mt="space.05"
        flexDir={['column', null, 'row']}
        alignItems={['flex-start', null, 'center']}
        justifyContent="space-between"
        gap="space.05"
      >
        <styled.p textStyle="caption.01" color="ink.text-subdued" whiteSpace="pre-line">
          {'Buy instantly through\ntrusted partners.'}
        </styled.p>
        <styled.img
          src="/marketing/home/partners.png"
          alt="Coinbase, Binance, MoonPay and Gate"
          width="100%"
          maxWidth="780px"
          loading="lazy"
        />
      </Flex>
    </Box>
  );
}
