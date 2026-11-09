import { Link } from 'react-router';

import { Flex, Grid, VStack, styled } from 'leather-styles/jsx';
import { Page } from '~/layouts/page/page';

import { Button } from '@leather.io/ui';

const notFoundLinks = [
  {
    title: 'Help',
    description: 'Quick answers and support for common questions.',
    href: '/support',
  },
  {
    title: 'Guides',
    description: 'Simple walkthroughs to get you started.',
    href: '/support',
  },
  {
    title: 'Developers',
    description: 'Docs and tools to help you build faster.',
    href: '/developers',
  },
];

export function NotFound() {
  return (
    <Page>
      <Flex
        alignItems="center"
        justifyContent="center"
        flexDir="column"
        minHeight="calc(100vh - 142px)"
        py="space.08"
      >
        <VStack gap="space.07" alignItems="center" maxWidth="840px" textAlign="center">
          <styled.h1 textStyle="heading.02">
            Oops! Seems like
            <br />
            you took a wrong turn
          </styled.h1>
          <Grid
            gridTemplateColumns={['1fr', '1fr', 'repeat(3, 1fr)']}
            gap="space.04"
            width="100%"
            textAlign="left"
          >
            {notFoundLinks.map(({ title, description, href }) => (
              <Link key={title} to={href} prefetch="intent">
                <VStack
                  alignItems="flex-start"
                  gap="space.02"
                  p="space.05"
                  height="100%"
                  borderRadius="md"
                  border="default"
                  _hover={{ bg: 'ink.component-background-hover' }}
                >
                  <styled.h2 textStyle="heading.05">{title}</styled.h2>
                  <styled.p textStyle="caption.01" color="ink.text-subdued">
                    {description}
                  </styled.p>
                </VStack>
              </Link>
            ))}
          </Grid>
          <styled.div>
            <Link to="/">
              <Button variant="outline">Return home</Button>
            </Link>
          </styled.div>
        </VStack>
      </Flex>
    </Page>
  );
}
