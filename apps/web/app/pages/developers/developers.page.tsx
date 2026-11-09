import { Link } from 'react-router';

import { Flex, Grid, VStack, styled } from 'leather-styles/jsx';
import { MarketingSection } from '~/features/marketing/marketing-components';
import { developerDocLinks } from '~/features/marketing/marketing-data';
import { Page } from '~/layouts/page/page';

const developerResources = [
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
    href: 'https://leather.gitbook.io/developers/',
  },
];

function isExternalHref(href: string) {
  return href.startsWith('https://');
}

export function DevelopersPage() {
  return (
    <Page>
      <Page.Header />
      <Page.Heading
        title="Everything you need to start building"
        subtitle="Whether you're just getting started or you're deep into development, you'll find everything you need right here. From quick-start guides to in-depth API references, this space is designed to help you ship faster and smarter."
      />

      <MarketingSection title="Start developing with Leather" pt="space.05">
        <VStack as="ul" alignItems="stretch" gap="0">
          {developerDocLinks.map(link => (
            <styled.li key={link.slug} borderBottom="default">
              <Link to={`/posts/${link.slug}`} prefetch="intent">
                <Flex
                  justifyContent="space-between"
                  alignItems="center"
                  py="space.04"
                  textStyle="label.01"
                  _hover={{ bg: 'ink.component-background-hover' }}
                >
                  {link.title}
                  <styled.span aria-hidden color="ink.text-subdued">
                    →
                  </styled.span>
                </Flex>
              </Link>
            </styled.li>
          ))}
        </VStack>
      </MarketingSection>

      <MarketingSection>
        <Grid gridTemplateColumns={['1fr', '1fr', 'repeat(3, 1fr)']} gap="space.04">
          {developerResources.map(resource => {
            const content = (
              <VStack
                alignItems="flex-start"
                gap="space.02"
                p="space.05"
                height="100%"
                borderRadius="md"
                border="default"
                _hover={{ bg: 'ink.component-background-hover' }}
              >
                <styled.h3 textStyle="heading.05">
                  {resource.title}
                  {isExternalHref(resource.href) && ' ↗'}
                </styled.h3>
                <styled.p textStyle="body.02" color="ink.text-subdued">
                  {resource.description}
                </styled.p>
              </VStack>
            );
            return isExternalHref(resource.href) ? (
              <styled.a
                key={resource.title}
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {content}
              </styled.a>
            ) : (
              <Link key={resource.title} to={resource.href} prefetch="intent">
                {content}
              </Link>
            );
          })}
        </Grid>
      </MarketingSection>
    </Page>
  );
}
