import { useState } from 'react';

import { Box, Flex, Grid, styled } from 'leather-styles/jsx';
import { DownloadLinks } from '~/components/marketing/download-links';
import { heroWords, marketingAsset } from '~/content/marketing-content';

const heroImages = {
  dark: marketingAsset('images/hero-dark.png'),
  light: marketingAsset('images/hero-light.png'),
};

export function HomeHero() {
  const [showLightTheme, setShowLightTheme] = useState(false);

  return (
    <styled.section>
      <Grid gridTemplateColumns={['1fr', null, null, '1fr 1fr']} gap="space.07" alignItems="start">
        <styled.h1
          textStyle="display.02"
          fontSize={['3.25rem', null, '4.5rem']}
          lineHeight={['3rem', null, '4rem']}
        >
          {heroWords.map((word, index) => (
            <styled.span
              key={word}
              display="inline-block"
              mr="0.2em"
              animation="fadein 0.6s ease both"
              _motionReduce={{ animation: 'none' }}
              style={{ animationDelay: `${index * 120}ms` }}
            >
              {word}
            </styled.span>
          ))}
        </styled.h1>
        <Flex flexDir="column" gap="space.05">
          <styled.p textStyle={['heading.05', null, 'heading.04']} fontWeight="normal">
            Leather is a wallet for Bitcoin and Stacks, designed for security, clarity, and growth.
            Join 100,000+ users on your favorite platform.
          </styled.p>
          <DownloadLinks />
        </Flex>
      </Grid>
      <Box
        position="relative"
        mt="space.08"
        bg="ink.background-secondary"
        borderRadius="md"
        overflow="hidden"
        px={['space.04', null, 'space.09']}
        pt={['space.06', null, 'space.08']}
      >
        <styled.button
          type="button"
          aria-pressed={showLightTheme}
          aria-label="Show the light theme"
          onClick={() => setShowLightTheme(value => !value)}
          position="absolute"
          top="space.04"
          right="space.04"
          width="44px"
          height="24px"
          borderRadius="round"
          bg={showLightTheme ? 'ink.text-primary' : 'ink.border-default'}
          transition="background 0.2s ease"
          cursor="pointer"
          zIndex={1}
        >
          <Box
            width="18px"
            height="18px"
            borderRadius="round"
            bg="ink.background-primary"
            transform={showLightTheme ? 'translateX(23px)' : 'translateX(3px)'}
            transition="transform 0.2s ease"
            _motionReduce={{ transition: 'none' }}
          />
        </styled.button>
        <styled.img
          src={showLightTheme ? heroImages.light : heroImages.dark}
          alt="Leather on desktop and mobile showing a wallet balance with Send, Receive, Swap and Buy actions"
          width="100%"
          height="auto"
          display="block"
          style={{ aspectRatio: '2048 / 1093' }}
          fetchPriority="high"
        />
      </Box>
    </styled.section>
  );
}
