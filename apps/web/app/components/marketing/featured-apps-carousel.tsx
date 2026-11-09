import { Link } from 'react-router';

import { Box, Flex, styled } from 'leather-styles/jsx';
import { type MarketingApp } from '~/content/marketing-content';
import { getPostPath } from '~/pages/redirects/content-slug-resolver';

import { ArrowTopRightIcon } from '@leather.io/ui';

interface FeaturedAppsCarouselProps {
  apps: MarketingApp[];
  cardWidth?: string;
}

export function FeaturedAppsCarousel({ apps, cardWidth = '300px' }: FeaturedAppsCarouselProps) {
  return (
    <Flex
      as="ul"
      gap="space.03"
      overflowX="auto"
      scrollSnapType="x mandatory"
      pb="space.03"
      aria-label="Featured apps"
    >
      {apps.map(app => (
        <styled.li
          key={app.name}
          flexShrink={0}
          scrollSnapAlign="start"
          style={{ width: cardWidth }}
        >
          <Link to={getPostPath(app.postSlug)}>
            <Box
              position="relative"
              aspectRatio="1"
              borderRadius="sm"
              overflow="hidden"
              bg="ink.text-primary"
              color="ink.background-primary"
              className="group"
            >
              {app.banner && (
                <styled.img
                  src={app.banner}
                  alt=""
                  position="absolute"
                  inset={0}
                  width="100%"
                  height="65%"
                  objectFit="cover"
                  loading="lazy"
                  transition="transform 0.4s ease"
                  _groupHover={{ transform: 'scale(1.04)' }}
                  _motionReduce={{ transition: 'none' }}
                />
              )}
              <Flex
                position="absolute"
                insetX={0}
                bottom={0}
                flexDir="column"
                gap="space.02"
                p="space.05"
              >
                <styled.img
                  src={app.logo}
                  alt=""
                  width="40px"
                  height="40px"
                  borderRadius="round"
                  bg="ink.background-primary"
                />
                <styled.h3 textStyle="label.01">{app.name}</styled.h3>
                <Flex gap="space.04" alignItems="flex-end">
                  <styled.p textStyle="caption.01" lineClamp={4}>
                    {app.description}
                  </styled.p>
                  <ArrowTopRightIcon variant="small" />
                </Flex>
              </Flex>
            </Box>
          </Link>
        </styled.li>
      ))}
    </Flex>
  );
}
