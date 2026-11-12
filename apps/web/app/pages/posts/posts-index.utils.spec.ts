import {
  type IndexPost,
  filterIndexPosts,
  filterNewsPosts,
  searchPosts,
} from './posts-index.utils';

function createPost(slug: string, overrides: Partial<IndexPost> = {}): IndexPost {
  return {
    _id: slug,
    title: slug,
    slug,
    category: 'Guides',
    summary: null,
    publishedAt: '2025-01-01',
    ...overrides,
  };
}

describe(filterIndexPosts.name, () => {
  it('keeps regular posts', () => {
    const posts = [createPost('what-is-stacks', { category: 'Stacks' })];
    expect(filterIndexPosts(posts, [])).toEqual(posts);
  });

  it('leaves off retired Ordinals, Runes and Stamps posts', () => {
    const posts = [
      createPost('send-ordinals'),
      createPost('bitcoin-runes'),
      createPost('receive-stamps'),
      createPost('fast-pool'),
    ];
    expect(filterIndexPosts(posts, []).map(post => post.slug)).toEqual(['fast-pool']);
  });

  it('keeps the deprecation announcements themselves', () => {
    const posts = [createPost('deprecation-of-ordinals-inscriptions-support-in-leather')];
    expect(filterIndexPosts(posts, [])).toEqual(posts);
  });

  it.each(['Apps', 'Legal', 'Tokens'])('leaves off posts in category %s', category => {
    expect(filterIndexPosts([createPost('some-post', { category })], [])).toEqual([]);
  });

  it('leaves off posts whose slug is also a guide', () => {
    const posts = [createPost('install-leather'), createPost('connect-apps')];
    expect(filterIndexPosts(posts, ['install-leather']).map(post => post.slug)).toEqual([
      'connect-apps',
    ]);
  });

  it('keeps posts without a category', () => {
    const posts = [createPost('uncategorised', { category: null })];
    expect(filterIndexPosts(posts, [])).toEqual(posts);
  });
});

describe(filterNewsPosts.name, () => {
  it('leaves off retired Ordinals, Runes and Stamps posts', () => {
    const posts = [
      createPost('see-your-runes-in-usd-with-leather', { category: 'News' }),
      createPost('grow-your-bitcoin-mobile-app', { category: 'News' }),
    ];
    expect(filterNewsPosts(posts).map(post => post.slug)).toEqual(['grow-your-bitcoin-mobile-app']);
  });
});

describe(searchPosts.name, () => {
  const posts = [
    createPost('what-is-stacks', { title: 'What is Stacks?', category: 'Stacks' }),
    createPost('fast-pool', { title: 'Fast Pool', summary: 'Pooled stacking with Fast Pool' }),
  ];

  it('returns every post for an empty query', () => {
    expect(searchPosts(posts, null)).toEqual(posts);
    expect(searchPosts(posts, '  ')).toEqual(posts);
  });

  it('matches titles case-insensitively', () => {
    expect(searchPosts(posts, 'STACKS?').map(post => post.slug)).toEqual(['what-is-stacks']);
  });

  it('matches summaries', () => {
    expect(searchPosts(posts, 'pooled').map(post => post.slug)).toEqual(['fast-pool']);
  });

  it('returns nothing when no post matches', () => {
    expect(searchPosts(posts, 'ordinals')).toEqual([]);
  });
});
