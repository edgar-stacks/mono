import { Form, Link } from 'react-router';

import { Box, Flex, VStack, styled } from 'leather-styles/jsx';
import { Page } from '~/layouts/page/page';
import { type PostSummary } from '~/pages/posts/posts-index.utils';

import { Button } from '@leather.io/ui';

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return null;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(dateString));
}

function buildPageHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  params.set('page', String(page));
  return `?${params.toString()}`;
}

interface PostListPageProps {
  title: string;
  posts: PostSummary[];
  hasMore: boolean;
  page: number;
  query?: string;
  searchable?: boolean;
  emptyMessage: string;
}

export function PostListPage({
  title,
  posts,
  hasMore,
  page,
  query = '',
  searchable = false,
  emptyMessage,
}: PostListPageProps) {
  return (
    <Page>
      <Page.Header />
      <Flex
        my="space.07"
        flexDir={['column', 'column', 'row']}
        gap="space.05"
        justifyContent="space-between"
        alignItems={[null, null, 'flex-end']}
      >
        <Page.Title textStyle="heading.02">{title}</Page.Title>
        {searchable && (
          <Form method="get" role="search">
            <styled.input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search posts"
              aria-label="Search posts"
              textStyle="label.02"
              px="space.04"
              py="space.03"
              width={['100%', '100%', '320px']}
              border="default"
              borderRadius="sm"
              bg="ink.background-primary"
            />
          </Form>
        )}
      </Flex>

      {posts.length === 0 ? (
        <styled.p textStyle="body.02" color="ink.text-subdued" mb="space.09">
          {emptyMessage}
        </styled.p>
      ) : (
        <VStack as="ul" alignItems="stretch" gap="0" mb="space.07">
          {posts.map(post => (
            <styled.li key={post._id} borderBottom="default">
              <Link to={`/posts/${post.slug}`} prefetch="intent">
                <Flex
                  flexDir={['column', 'column', 'row']}
                  gap={['space.02', 'space.02', 'space.07']}
                  py="space.05"
                  _hover={{ bg: 'ink.component-background-hover' }}
                >
                  <styled.span
                    textStyle="caption.01"
                    color="ink.text-subdued"
                    minWidth="120px"
                    pt="space.01"
                  >
                    {formatDate(post.publishedAt)}
                  </styled.span>
                  <Box>
                    <styled.h2 textStyle="heading.05">{post.title}</styled.h2>
                    {post.summary && (
                      <styled.p textStyle="body.02" color="ink.text-subdued" mt="space.02">
                        {post.summary}
                      </styled.p>
                    )}
                  </Box>
                </Flex>
              </Link>
            </styled.li>
          ))}
        </VStack>
      )}

      {hasMore && (
        <Flex justifyContent="center" mb="space.09">
          <Link to={buildPageHref(page + 1, query)} preventScrollReset>
            <Button variant="outline">Load more +</Button>
          </Link>
        </Flex>
      )}
    </Page>
  );
}
