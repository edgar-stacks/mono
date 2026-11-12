import { Link } from 'react-router';

import { Box, Flex, Grid, styled } from 'leather-styles/jsx';

import { type ChangelogStripEntry } from './changelog-strip.queries';
import { formatMarketingDate } from './format-marketing-date';
import { MarketingHeading, MarketingSection } from './section-heading';

const StyledLink = styled(Link);

interface ChangelogStripProps {
  entries: ChangelogStripEntry[];
}

export function ChangelogStrip({ entries }: ChangelogStripProps) {
  return (
    <MarketingSection aria-labelledby="changelog-strip-heading">
      <Flex justifyContent="space-between" alignItems="flex-end" gap="space.04" mb="space.06">
        <MarketingHeading id="changelog-strip-heading">Changelog</MarketingHeading>
        <StyledLink
          to="/changelog"
          prefetch="intent"
          textStyle="label.02"
          borderBottom="1px solid"
          borderColor="ink.border-default"
          _hover={{ borderColor: 'ink.action-primary-hover' }}
        >
          See what’s new in Leather
        </StyledLink>
      </Flex>
      {entries.length > 0 && (
        <Grid
          gridTemplateColumns={['1fr', 'repeat(2, 1fr)', null, 'repeat(4, 1fr)']}
          gap={0}
          border="default"
          borderRadius="sm"
          overflow="hidden"
        >
          {entries.map(entry => (
            <StyledLink
              key={entry._id}
              to={`/changelog/${encodeURIComponent(entry.slug)}`}
              prefetch="intent"
              display="flex"
              flexDir="column"
              justifyContent="space-between"
              gap="space.07"
              minHeight="186px"
              p="space.05"
              borderRight="default"
              borderBottom="default"
              _hover={{ bg: 'ink.component-background-hover' }}
            >
              <styled.time
                textStyle="label.02"
                color="ink.text-subdued"
                dateTime={entry.publishedAt}
              >
                {formatMarketingDate(entry.publishedAt)}
              </styled.time>
              <Box>
                {entry.tags?.map(tag => (
                  <styled.span
                    key={tag}
                    display="inline-block"
                    textStyle="caption.02"
                    color="ink.text-subdued"
                    border="default"
                    borderRadius="999px"
                    px="space.02"
                    mr="space.02"
                    mb="space.02"
                  >
                    {tag}
                  </styled.span>
                ))}
                <styled.h3 textStyle="heading.05">{entry.title}</styled.h3>
              </Box>
            </StyledLink>
          ))}
        </Grid>
      )}
    </MarketingSection>
  );
}
