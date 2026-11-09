import { getPostHref } from './post-link';

describe('getPostHref', () => {
  it('returns the internal post path for a valid slug', () => {
    expect(getPostHref('test-slug')).toBe('/posts/test-slug');
  });

  it('trims whitespace around the slug', () => {
    expect(getPostHref('  test-slug  ')).toBe('/posts/test-slug');
  });

  it('returns absolute URLs unchanged', () => {
    expect(getPostHref('https://example.com/article')).toBe('https://example.com/article');
  });

  it('handles empty slug gracefully', () => {
    expect(getPostHref('')).toBe('/posts/');
  });

  it('handles undefined slug gracefully', () => {
    expect(getPostHref(undefined)).toBe('/posts/undefined');
  });
});
