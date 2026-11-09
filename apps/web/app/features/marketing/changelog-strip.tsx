import { Link } from 'react-router';

import { Flex, Grid, VStack, styled } from 'leather-styles/jsx';

import { MarketingSection, PlatformBadge } from './marketing-components';
import { type ChangelogHighlight } from './marketing.queries';

function formatChangelogDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

interface ChangelogStripProps {
  entries: ChangelogHighlight[];
}

export function ChangelogStrip({ entries }: ChangelogStripProps) {
  if (entries.length === 0) return null;

  return (
    <MarketingSection
      eyebrow="changelog"
      title={
        <Link to="/changelog" prefetch="intent">
          See what’s new in Leather
        </Link>
      }
    >
      <Grid gridTemplateColumns={['1fr', '1fr', 'repeat(2, 1fr)', 'repeat(4, 1fr)']} gap="space.04">
        {entries.map(entry => (
          <Link key={entry._id} to={`/changelog/${entry.slug}`} prefetch="intent">
            <VStack
              alignItems="flex-start"
              gap="space.03"
              p="space.05"
              height="100%"
              borderRadius="md"
              border="default"
              _hover={{ bg: 'ink.component-background-hover' }}
            >
              <Flex gap="space.02" alignItems="center" flexWrap="wrap">
                <styled.time
                  textStyle="caption.01"
                  color="ink.text-subdued"
                  dateTime={entry.publishedAt}
                >
                  {formatChangelogDate(entry.publishedAt)}
                </styled.time>
                {entry.tags?.map(tag => <PlatformBadge key={tag.name} platform={tag.name} />)}
              </Flex>
              <styled.h3 textStyle="label.01">{entry.title}</styled.h3>
            </VStack>
          </Link>
        ))}
      </Grid>
    </MarketingSection>
  );
}
