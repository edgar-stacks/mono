import {
  type PostSummary,
  filterNewsPosts,
  filterPostsIndex,
  paginatePosts,
  parsePageParam,
  postsPageSize,
  searchPosts,
} from './posts-index.utils';

function createPost(slug: string, overrides: Partial<PostSummary> = {}): PostSummary {
  return { _id: slug, title: slug, slug, category: 'Explainers', ...overrides };
}

describe(filterPostsIndex.name, () => {
  it('keeps regular posts', () => {
    const posts = [createPost('what-is-stacks')];
    expect(filterPostsIndex(posts, [])).toEqual(posts);
  });

  it('leaves out retired Ordinals, Runes and Stamps posts', () => {
    const posts = [
      createPost('send-ordinals'),
      createPost('bitcoin-runes'),
      createPost('receive-stamps'),
    ];
    expect(filterPostsIndex(posts, [])).toEqual([]);
  });

  it('keeps the deprecation announcements themselves', () => {
    const posts = [createPost('deprecation-of-ordinals-inscriptions-support-in-leather')];
    expect(filterPostsIndex(posts, [])).toEqual(posts);
  });

  it.each(['Apps', 'Legal', 'Tokens'])('leaves out the %s category', category => {
    expect(filterPostsIndex([createPost('some-post', { category })], [])).toEqual([]);
  });

  it('leaves out slugs that are also guides', () => {
    const posts = [createPost('install-leather'), createPost('what-is-stacks')];
    expect(filterPostsIndex(posts, ['install-leather']).map(post => post.slug)).toEqual([
      'what-is-stacks',
    ]);
  });
});

describe(filterNewsPosts.name, () => {
  it('keeps only News posts that are not retired', () => {
    const posts = [
      createPost('grow-your-bitcoin-mobile-app', { category: 'News' }),
      createPost('see-your-runes-in-usd-with-leather', { category: 'News' }),
      createPost('what-is-stacks'),
    ];
    expect(filterNewsPosts(posts).map(post => post.slug)).toEqual(['grow-your-bitcoin-mobile-app']);
  });
});

describe(searchPosts.name, () => {
  const posts = [
    createPost('a', { title: 'What is Stacks?', summary: 'A Bitcoin layer' }),
    createPost('b', { title: 'Fees explained', summary: 'Network fees on Bitcoin' }),
  ];

  it('returns every post for an empty query', () => {
    expect(searchPosts(posts, '  ')).toEqual(posts);
  });

  it('matches the title and summary case-insensitively', () => {
    expect(searchPosts(posts, 'stacks').map(post => post.slug)).toEqual(['a']);
    expect(searchPosts(posts, 'BITCOIN').map(post => post.slug)).toEqual(['a', 'b']);
  });

  it('requires every term to match', () => {
    expect(searchPosts(posts, 'bitcoin fees').map(post => post.slug)).toEqual(['b']);
  });
});

describe(parsePageParam.name, () => {
  it.each([
    [null, 1],
    ['', 1],
    ['0', 1],
    ['-2', 1],
    ['1.5', 1],
    ['abc', 1],
    ['3', 3],
  ])('parses %s as %s', (value, expected) => {
    expect(parsePageParam(value)).toBe(expected);
  });
});

describe(paginatePosts.name, () => {
  const posts = Array.from({ length: postsPageSize + 2 }, (_, index) =>
    createPost(`post-${index}`)
  );

  it('returns the first page and reports more', () => {
    const result = paginatePosts(posts, 1);
    expect(result.posts).toHaveLength(postsPageSize);
    expect(result.hasMore).toBe(true);
  });

  it('returns every post up to the requested page', () => {
    const result = paginatePosts(posts, 2);
    expect(result.posts).toHaveLength(postsPageSize + 2);
    expect(result.hasMore).toBe(false);
  });
});
