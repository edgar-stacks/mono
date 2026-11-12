import { useState } from 'react';
import { Link } from 'react-router';

import { Box, Flex, Grid, styled } from 'leather-styles/jsx';
import { formatMarketingDate } from '~/features/marketing/format-marketing-date';
import { LoadMoreButton } from '~/features/marketing/load-more';
import { Page } from '~/layouts/page/page';
import { type IndexPost, postsPageSize } from '~/pages/posts/posts-index.utils';
import { postPath } from '~/pages/redirects/content-slug-resolver';

import { getNewsImage } from './news-images';

const StyledLink = styled(Link);

interface NewsThumbnailProps {
  slug: string;
}

function NewsThumbnail({ slug }: NewsThumbnailProps) {
  const image = getNewsImage(slug);
  if (!image) {
    return (
      <Box
        aria-hidden
        width="100%"
        height="100%"
        bgGradient="to-br"
        gradientFrom="#FFA93A"
        gradientTo="#FF5F2E"
      />
    );
  }
  return (
    <styled.img src={image} alt="" width="100%" height="100%" objectFit="cover" loading="lazy" />
  );
}

interface FeaturedNewsPostProps {
  post: IndexPost;
}

function FeaturedNewsPost({ post }: FeaturedNewsPostProps) {
  return (
    <StyledLink to={postPath(post.slug)} prefetch="intent" display="block" mt="space.07">
      <Grid gridTemplateColumns={['1fr', null, '1fr 1fr']} gap="space.07">
        <Box>
          <styled.h2 textStyle="heading.03" fontSize={['1.75rem', null, '2rem']}>
            {post.title}
          </styled.h2>
          {post.summary && (
            <styled.p textStyle="body.01" mt="space.04" lineClamp={4}>
              {post.summary}
            </styled.p>
          )}
        </Box>
        <Box aspectRatio="16 / 10" overflow="hidden">
          <NewsThumbnail slug={post.slug} />
        </Box>
      </Grid>
    </StyledLink>
  );
}

interface NewsPageProps {
  posts: IndexPost[];
}

export function NewsPage({ posts }: NewsPageProps) {
  const [visibleCount, setVisibleCount] = useState(postsPageSize + 1);
  const [featured, ...rest] = posts;
  const visiblePosts = rest.slice(0, visibleCount - 1);

  return (
    <Page>
      <Page.Header title="News" />
      {featured && <FeaturedNewsPost post={featured} />}
      <styled.ul mt="space.07" borderTop="default">
        {visiblePosts.map(post => (
          <styled.li key={post._id} borderBottom="default">
            <StyledLink
              to={postPath(post.slug)}
              prefetch="intent"
              display="flex"
              alignItems="center"
              gap="space.05"
              py="space.05"
              _hover={{ '& h3': { textDecoration: 'underline' } }}
            >
              <Box flex="none" width="120px" aspectRatio="16 / 10" overflow="hidden">
                <NewsThumbnail slug={post.slug} />
              </Box>
              <Flex flexDir="column" gap="space.01">
                <styled.h3 textStyle="label.01" fontWeight={400}>
                  {post.title}
                </styled.h3>
                <styled.time
                  textStyle="caption.01"
                  color="ink.text-subdued"
                  dateTime={post.publishedAt ?? undefined}
                >
                  {formatMarketingDate(post.publishedAt)}
                </styled.time>
              </Flex>
            </StyledLink>
          </styled.li>
        ))}
      </styled.ul>
      {visiblePosts.length < rest.length && (
        <LoadMoreButton onClick={() => setVisibleCount(count => count + postsPageSize)} />
      )}
      <Box mb="space.10" />
    </Page>
  );
}
