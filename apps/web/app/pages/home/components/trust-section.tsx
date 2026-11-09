import { Flex, Grid, styled } from 'leather-styles/jsx';
import { MarketingHeading } from '~/components/marketing/marketing-heading';
import { trustPoints } from '~/content/marketing-content';

import { CodeIcon, ShieldIcon, TerminalIcon } from '@leather.io/ui';

const trustIcons = [CodeIcon, ShieldIcon, TerminalIcon];

export function TrustSection() {
  return (
    <styled.section>
      <MarketingHeading>
        Built on trust.
        <br />
        Safety by design.
      </MarketingHeading>
      <Grid
        as="ul"
        mt="space.07"
        gridTemplateColumns={['1fr', null, 'repeat(3, 1fr)']}
        gap={0}
        border="default"
        borderRadius="md"
        overflow="hidden"
      >
        {trustPoints.map((point, index) => {
          const Icon = trustIcons[index] ?? ShieldIcon;
          return (
            <Flex
              as="li"
              key={point.title}
              flexDir="column"
              gap="space.03"
              p="space.05"
              borderRight="default"
              borderBottom="default"
              mr="-1px"
              mb="-1px"
            >
              <Icon />
              <styled.h3 mt="space.04" textStyle="heading.05">
                {point.title}
              </styled.h3>
              <styled.p textStyle="body.01" color="ink.text-subdued">
                {point.description}
              </styled.p>
              <styled.a
                href={point.href}
                target="_blank"
                rel="noopener noreferrer"
                alignSelf="flex-start"
                textStyle="label.01"
                borderBottom="1px solid"
                borderColor="ink.border-default"
              >
                Learn more ↗
              </styled.a>
              <Flex
                mt="space.04"
                height="160px"
                alignItems="center"
                justifyContent="center"
                bg="ink.text-primary"
                borderRadius="sm"
              >
                <styled.img
                  src={point.logo}
                  alt={point.logoAlt}
                  maxHeight="72px"
                  maxWidth="70%"
                  bg="ink.background-primary"
                  borderRadius="sm"
                  p="space.03"
                  loading="lazy"
                />
              </Flex>
            </Flex>
          );
        })}
      </Grid>
    </styled.section>
  );
}
