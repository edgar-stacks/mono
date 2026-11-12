import { Link } from 'react-router';

import { Box, Flex, styled } from 'leather-styles/jsx';

const StyledLink = styled(Link);

interface FeaturedApp {
  name: string;
  description: string;
  href: string;
  banner: string;
  logo: string;
}

const bitflow: FeaturedApp = {
  name: 'Bitflow',
  description:
    'A Bitcoin-native DEX aggregator and liquidity hub that sources the best prices across Stacks-based protocols.',
  href: '/posts/bitflow',
  banner: '/marketing/featured/bitflow.png',
  logo: '/marketing/logos/bitflow.png',
};

const zest: FeaturedApp = {
  name: 'Zest Protocol',
  description:
    'A Bitcoin-native protocol on Stacks for borrowing, lending, and yield generation through overcollateralized loans and BTC staking pools',
  href: '/posts/zest',
  banner: '/marketing/featured/zest.png',
  logo: '/marketing/logos/zest.svg',
};

const hermetica: FeaturedApp = {
  name: 'Hermetica',
  description:
    'A Bitcoin-backed synthetic dollar that generates up to 25% APY through delta-neutral strategies',
  href: '/posts/hermetica',
  banner: '/marketing/featured/hermetica.png',
  logo: '/marketing/logos/hermetica.svg',
};

const granite: FeaturedApp = {
  name: 'Granite',
  description:
    'Use sBTC to borrow stablecoins non-custodially, without risk of forced liquidations',
  href: '/posts/granite',
  banner: '/marketing/featured/granite.png',
  logo: '/marketing/logos/granite.svg',
};

const arkadiko: FeaturedApp = {
  name: 'Arkadiko',
  description:
    'A Bitcoin-secured protocol for vault-based borrowing, USDA minting, and decentralized smart contract automation.',
  href: '/posts/arkadiko',
  banner: '/marketing/featured/arkadiko.png',
  logo: '/marketing/logos/arkadiko.svg',
};

const alex: FeaturedApp = {
  name: 'ALEX',
  description:
    'A DeFi platform on Stacks offering swaps, staking, fixed-term lending, and cross-chain liquidity with Bitcoin security',
  href: '/posts/alex',
  banner: '/marketing/featured/alex.png',
  logo: '/marketing/logos/alex.png',
};

export const appsPageFeaturedApps = [bitflow, zest, hermetica, granite, arkadiko];
export const explorerFeaturedApps = [bitflow, zest, hermetica, granite, alex, arkadiko];

interface FeaturedAppsCarouselProps {
  apps: FeaturedApp[];
  compact?: boolean;
}

export function FeaturedAppsCarousel({ apps, compact = false }: FeaturedAppsCarouselProps) {
  return (
    <styled.ul
      display="flex"
      gap="space.03"
      overflowX="auto"
      scrollSnapType="x mandatory"
      pb="space.03"
      css={{ scrollbarWidth: 'thin' }}
    >
      {apps.map(app => (
        <styled.li
          key={app.name}
          flex="none"
          width={compact ? '85%' : ['85%', '60%', '45%', '300px']}
          scrollSnapAlign="start"
        >
          <StyledLink
            to={app.href}
            prefetch="intent"
            display="block"
            position="relative"
            aspectRatio="1"
            bg="black"
            color="white"
            overflow="hidden"
            className="group"
          >
            <styled.img
              src={app.banner}
              alt=""
              position="absolute"
              inset={0}
              width="100%"
              height="100%"
              objectFit="cover"
              loading="lazy"
              transition="transform 0.4s ease"
              _groupHover={{ transform: 'scale(1.03)' }}
            />
            <Box
              position="absolute"
              insetX={0}
              bottom={0}
              p="space.05"
              bgGradient="to-t"
              gradientFrom="black"
              gradientTo="transparent"
            >
              <styled.img
                src={app.logo}
                alt=""
                width="40px"
                height="40px"
                borderRadius="50%"
                bg="white"
                mb="space.04"
              />
              <styled.h3 textStyle="label.01">{app.name}</styled.h3>
              <Flex alignItems="flex-end" justifyContent="space-between" gap="space.04">
                <styled.p textStyle="caption.01" lineClamp={4}>
                  {app.description}
                </styled.p>
                <styled.span aria-hidden textStyle="label.01">
                  ↗
                </styled.span>
              </Flex>
            </Box>
          </StyledLink>
        </styled.li>
      ))}
    </styled.ul>
  );
}
