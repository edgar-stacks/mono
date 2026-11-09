import { Link } from 'react-router';

import { Flex, Grid, styled } from 'leather-styles/jsx';
import { formatPostDate } from '~/pages/posts/components/format-post-date';

import { type ChangelogStripEntry } from './changelog-strip.query';
import { MarketingBadge } from './marketing-badge';
import { MarketingHeading } from './marketing-heading';

interface ChangelogStripProps {
  entries: ChangelogStripEntry[];
}

export function ChangelogStrip({ entries }: ChangelogStripProps) {
  return (
    <styled.section>
      <Flex justifyContent="space-between" alignItems="baseline" gap="space.04" flexWrap="wrap">
        <MarketingHeading>Changelog</MarketingHeading>
        <styled.span textStyle="label.02" borderBottom="1px solid" borderColor="ink.border-default">
          <Link to="/changelog">See what’s new in Leather</Link>
        </styled.span>
      </Flex>
      {entries.length > 0 && (
        <Grid
          as="ul"
          mt="space.07"
          gridTemplateColumns={['1fr', 'repeat(2, 1fr)', null, 'repeat(4, 1fr)']}
          border="default"
          borderRadius="md"
          gap={0}
          overflow="hidden"
        >
          {entries.map(entry => (
            <styled.li
              key={entry._id}
              borderRight="default"
              borderBottom="default"
              mr="-1px"
              mb="-1px"
            >
              <Link to={`/changelog/${entry.slug}`}>
                <Flex
                  flexDir="column"
                  justifyContent="space-between"
                  gap="space.06"
                  height="100%"
                  minHeight="180px"
                  p="space.05"
                  _hover={{ bg: 'ink.component-background-hover' }}
                >
                  <styled.span textStyle="body.02" color="ink.text-subdued">
                    {formatPostDate(entry.publishedAt)}
                  </styled.span>
                  <Flex flexDir="column" alignItems="flex-start" gap="space.02">
                    {entry.tags?.map(tag => <MarketingBadge key={tag}>{tag}</MarketingBadge>)}
                    <styled.h3 textStyle="heading.05">{entry.title}</styled.h3>
                  </Flex>
                </Flex>
              </Link>
            </styled.li>
          ))}
        </Grid>
      )}
    </styled.section>
  );
}
