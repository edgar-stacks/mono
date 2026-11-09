import { Link } from 'react-router';

import { Grid, VStack, styled } from 'leather-styles/jsx';
import { Page } from '~/layouts/page/page';
import { formatPostDate } from '~/pages/posts/components/format-post-date';
import { LoadMoreLink } from '~/pages/posts/components/load-more-link';
import { getPostsPage, isNewsPost, parsePageParam } from '~/pages/posts/posts-index.utils';
import { fetchPostList } from '~/pages/posts/posts-list.query';
import { getPostPath } from '~/pages/redirects/content-slug-resolver';
import { marketingCacheHeaders, marketingMeta } from '~/pages/seo/marketing-meta';

import { type Route } from './+types/news.route';

const newsPageSize = 12;

export function meta() {
  return marketingMeta({ title: 'News', path: '/news' });
}

export function headers() {
  return marketingCacheHeaders;
}

export async function loader({ request }: Route.LoaderArgs) {
  const page = parsePageParam(new URL(request.url).searchParams.get('page'));
  const { posts } = await fetchPostList();
  return getPostsPage(posts.filter(isNewsPost), page, newsPageSize);
}

export default function NewsRoute({ loaderData }: Route.ComponentProps) {
  const { posts, nextPage } = loaderData;

  return (
    <Page>
      <Page.Header />
      <Page.Heading title="News" />
      {posts.length === 0 ? (
        <styled.p textStyle="body.02" color="ink.text-subdued">
          No news to show right now.
        </styled.p>
      ) : (
        <Grid as="ul" gridTemplateColumns={['1fr', null, 'repeat(2, 1fr)']} gap="space.06">
          {posts.map(post => (
            <styled.li key={post._id}>
              <Link to={getPostPath(post.slug)}>
                <VStack
                  alignItems="flex-start"
                  gap="space.03"
                  height="100%"
                  p="space.05"
                  border="default"
                  borderRadius="md"
                  _hover={{ bg: 'ink.component-background-hover' }}
                >
                  {post.imageUrl && (
                    <styled.img
                      src={post.imageUrl}
                      alt=""
                      width="100%"
                      borderRadius="sm"
                      aspectRatio="16 / 10"
                      objectFit="cover"
                      loading="lazy"
                    />
                  )}
                  <styled.span textStyle="caption.01" color="ink.text-subdued">
                    {formatPostDate(post.publishedAt)}
                  </styled.span>
                  <styled.h2 textStyle="heading.05">{post.title}</styled.h2>
                  {post.summary && (
                    <styled.p textStyle="body.02" color="ink.text-subdued" lineClamp={3}>
                      {post.summary}
                    </styled.p>
                  )}
                </VStack>
              </Link>
            </styled.li>
          ))}
        </Grid>
      )}
      <LoadMoreLink nextPage={nextPage} />
    </Page>
  );
}
