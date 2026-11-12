import { useState } from 'react';
import { Form, Link } from 'react-router';

import { Box, Flex, styled } from 'leather-styles/jsx';
import { LoadMoreButton } from '~/features/marketing/load-more';
import { Page } from '~/layouts/page/page';
import { postPath } from '~/pages/redirects/content-slug-resolver';

import { MagnifyingGlassIcon } from '@leather.io/ui';

import { type IndexPost, postsPageSize } from './posts-index.utils';

const StyledLink = styled(Link);

interface PostsIndexPageProps {
  posts: IndexPost[];
  query: string;
  totalCount: number;
}

export function PostsIndexPage({ posts, query, totalCount }: PostsIndexPageProps) {
  const [visibleCount, setVisibleCount] = useState(postsPageSize);
  const visiblePosts = posts.slice(0, visibleCount);

  return (
    <Page>
      <Page.Header title="Posts" />
      <Form method="get" role="search">
        <Flex alignItems="center" gap="space.03" borderBottom="default" py="space.04">
          <MagnifyingGlassIcon variant="small" color="ink.text-subdued" />
          <styled.input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={`Search ${totalCount} items...`}
            aria-label="Search posts"
            flex={1}
            textStyle="body.02"
            bg="transparent"
            outline="none"
          />
        </Flex>
      </Form>
      {posts.length === 0 && (
        <styled.p textStyle="body.02" color="ink.text-subdued" py="space.07">
          No posts match “{query}”.
        </styled.p>
      )}
      <styled.ul>
        {visiblePosts.map(post => (
          <styled.li key={post._id} borderBottom="default">
            <StyledLink
              to={postPath(post.slug)}
              prefetch="intent"
              display="block"
              py="space.05"
              _hover={{ '& h2': { textDecoration: 'underline' } }}
            >
              <styled.h2 textStyle="heading.05" fontWeight={400}>
                {post.title}
              </styled.h2>
              {post.category && (
                <styled.p textStyle="caption.01" color="ink.text-subdued" mt="space.02">
                  {post.category}
                </styled.p>
              )}
            </StyledLink>
          </styled.li>
        ))}
      </styled.ul>
      {visibleCount < posts.length && (
        <LoadMoreButton onClick={() => setVisibleCount(count => count + postsPageSize)} />
      )}
      <Box mb="space.10" />
    </Page>
  );
}
