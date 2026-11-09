import {
  type PostListItem,
  filterPostsByQuery,
  getPostsPage,
  isNewsPost,
  isPostsIndexPost,
  parsePageParam,
} from './posts-index.utils';

function createPost(overrides: Partial<PostListItem> = {}): PostListItem {
  return {
    _id: overrides.slug ?? 'post',
    title: 'What is Stacks?',
    slug: 'what-is-stacks',
    summary: 'Stacks brings smart contracts to Bitcoin',
    publishedAt: '2025-01-01',
    category: 'Explainers',
    imageUrl: null,
    ...overrides,
  };
}

const noGuides = new Set<string>();

describe(isPostsIndexPost.name, () => {
  it('lists regular posts', () => {
    expect(isPostsIndexPost(createPost(), noGuides)).toBe(true);
  });

  it('lists posts without a category', () => {
    expect(isPostsIndexPost(createPost({ category: null }), noGuides)).toBe(true);
  });

  it.each(['Apps', 'Legal', 'Tokens'])('leaves out posts in category %s', category => {
    expect(isPostsIndexPost(createPost({ category }), noGuides)).toBe(false);
  });

  it('leaves out posts whose slug is also a guide', () => {
    const post = createPost({ slug: 'install-leather' });

    expect(isPostsIndexPost(post, new Set(['install-leather']))).toBe(false);
  });

  it.each(['send-ordinals', 'bitcoin-runes', 'receive-stamps'])(
    'leaves out retired Ordinals, Runes and Stamps post %s',
    slug => {
      expect(isPostsIndexPost(createPost({ slug }), noGuides)).toBe(false);
    }
  );
});

describe(isNewsPost.name, () => {
  it('lists posts in category News', () => {
    expect(isNewsPost(createPost({ category: 'News' }))).toBe(true);
  });

  it('leaves out posts in other categories', () => {
    expect(isNewsPost(createPost({ category: 'Guides' }))).toBe(false);
  });

  it('leaves out retired news posts', () => {
    expect(
      isNewsPost(createPost({ category: 'News', slug: 'see-your-runes-in-usd-with-leather' }))
    ).toBe(false);
  });
});

describe(filterPostsByQuery.name, () => {
  const posts = [
    createPost({ slug: 'what-is-stacks', title: 'What is Stacks?' }),
    createPost({
      slug: 'fast-pool',
      title: 'Fast Pool',
      summary: 'Pooled Stacking with Fast Pool',
    }),
  ];

  it('returns every post for an empty query', () => {
    expect(filterPostsByQuery(posts, '  ')).toEqual(posts);
  });

  it('matches titles and summaries without regard to case', () => {
    expect(filterPostsByQuery(posts, 'POOLED').map(post => post.slug)).toEqual(['fast-pool']);
  });

  it('requires every term to match', () => {
    expect(filterPostsByQuery(posts, 'fast stacks').map(post => post.slug)).toEqual([]);
  });
});

describe(parsePageParam.name, () => {
  it.each([
    [null, 1],
    ['', 1],
    ['abc', 1],
    ['0', 1],
    ['-2', 1],
    ['1.5', 1],
    ['3', 3],
  ])('parses %s as page %i', (value, page) => {
    expect(parsePageParam(value)).toBe(page);
  });
});

describe(getPostsPage.name, () => {
  const posts = Array.from({ length: 5 }, (_, index) => createPost({ slug: `post-${index}` }));

  it('shows the first page and points at the next one', () => {
    const page = getPostsPage(posts, 1, 2);

    expect(page.posts.map(post => post.slug)).toEqual(['post-0', 'post-1']);
    expect(page.nextPage).toBe(2);
  });

  it('shows every post up to the requested page', () => {
    expect(getPostsPage(posts, 2, 2).posts).toHaveLength(4);
  });

  it('has no next page once every post is shown', () => {
    expect(getPostsPage(posts, 3, 2).nextPage).toBeNull();
  });
});
