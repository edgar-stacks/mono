import { type ReactNode } from 'react';
import { Link } from 'react-router';

import { Box, Grid, styled } from 'leather-styles/jsx';

import { GlassesIcon, SupportIcon, TerminalIcon } from '@leather.io/ui';

import { marketingLinks } from './marketing-links';

const StyledLink = styled(Link);

interface HelpCard {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}

const helpCards: HelpCard[] = [
  {
    title: 'Help',
    description: 'Quick answers and support for common questions.',
    href: '/support',
    icon: <SupportIcon />,
  },
  {
    title: 'Guides',
    description: 'Simple walkthroughs to get you started.',
    href: '/posts',
    icon: <GlassesIcon />,
  },
  {
    title: 'Developers',
    description: 'Docs and tools to help you build faster.',
    href: marketingLinks.developerDocs,
    icon: <TerminalIcon />,
  },
];

export function HelpCards() {
  return (
    <Grid
      gridTemplateColumns={['1fr', null, 'repeat(3, 1fr)']}
      gap={0}
      borderY="default"
      width="100%"
    >
      {helpCards.map(({ title, description, href, icon }) => (
        <StyledLink
          key={title}
          to={href}
          prefetch="intent"
          display="flex"
          flexDir="column"
          gap="space.09"
          p="space.07"
          borderRight={[null, null, 'default']}
          borderBottom={['default', null, 'none']}
          _last={{ borderRight: 'none', borderBottom: 'none' }}
          _hover={{ bg: 'ink.component-background-hover' }}
        >
          <Box
            width="48px"
            height="48px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="ink.background-secondary"
          >
            {icon}
          </Box>
          <Box>
            <styled.h3 textStyle="heading.05">{title}</styled.h3>
            <styled.p textStyle="caption.01" color="ink.text-subdued">
              {description}
            </styled.p>
          </Box>
        </StyledLink>
      ))}
    </Grid>
  );
}
