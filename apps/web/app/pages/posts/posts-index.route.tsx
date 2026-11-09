import { Form, Link } from 'react-router';

import { Box, Flex, VStack, styled } from 'leather-styles/jsx';
import { Page } from '~/layouts/page/page';
import { getPostPath } from '~/pages/redirects/content-slug-resolver';
import { marketingCacheHeaders, marketingMeta } from '~/pages/seo/marketing-meta';

import { Button } from '@leather.io/ui';

import { type Route } from './+types/posts-index.route';
import { LoadMoreLink } from './components/load-more-link';
import {
  filterPostsByQuery,
  getPostsPage,
  isPostsIndexPost,
  parsePageParam,
} from './posts-index.utils';
import { fetchPostList } from './posts-list.query';

const postsPageSize = 24;

export function meta() {
  return marketingMeta({
    title: 'All posts',
    path: '/posts',
    description:
      'Stay up to date and read about the latest integrations, partnerships, new features and more from Leather Bitcoin wallet with the Leather blog.',
  });
}

export function headers() {
  return marketingCacheHeaders;
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';
  const page = parsePageParam(url.searchParams.get('page'));
  const { posts, guideSlugs } = await fetchPostList();
  const listedPosts = posts.filter(post => isPostsIndexPost(post, guideSlugs));

  return { query, ...getPostsPage(filterPostsByQuery(listedPosts, query), page, postsPageSize) };
}

export default function PostsIndexRoute({ loaderData }: Route.ComponentProps) {
  const { query, posts, nextPage } = loaderData;

  return (
    <Page>
      <Page.Header />
      <Page.Heading title="Posts" />
      <Form method="get" role="search">
        <Flex gap="space.03" maxW="560px">
          <styled.input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search posts"
            aria-label="Search posts"
            flex={1}
            px="space.04"
            py="space.03"
            textStyle="body.02"
            border="default"
            borderRadius="sm"
            bg="ink.background-primary"
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </Flex>
      </Form>
      {posts.length === 0 ? (
        <styled.p mt="space.07" textStyle="body.02" color="ink.text-subdued">
          {query ? `No posts match “${query}”.` : 'No posts to show right now.'}
        </styled.p>
      ) : (
        <VStack as="ul" alignItems="stretch" gap={0} mt="space.06">
          {posts.map(post => (
            <styled.li key={post._id} borderBottom="default">
              <Link to={getPostPath(post.slug)}>
                <Flex
                  justifyContent="space-between"
                  alignItems="baseline"
                  gap="space.04"
                  py="space.04"
                  _hover={{ color: 'ink.text-subdued' }}
                >
                  <styled.span textStyle="label.01">{post.title}</styled.span>
                  {post.category && (
                    <Box textStyle="caption.01" color="ink.text-subdued" flexShrink={0}>
                      {post.category}
                    </Box>
                  )}
                </Flex>
              </Link>
            </styled.li>
          ))}
        </VStack>
      )}
      <LoadMoreLink nextPage={nextPage} query={query} />
    </Page>
  );
}
