import { getPostHref } from './post-link';

describe('getPostHref', () => {
  it('returns correct URL for valid slug', () => {
    expect(getPostHref('test-slug')).toBe('/posts/test-slug');
  });

  it('handles empty slug gracefully', () => {
    expect(getPostHref('')).toBe('/posts/');
  });

  it('handles undefined slug gracefully', () => {
    expect(getPostHref(undefined)).toBe('/posts/undefined');
  });

  it('trims whitespace around the slug', () => {
    expect(getPostHref(' test-slug ')).toBe('/posts/test-slug');
  });

  it('returns absolute URLs unchanged', () => {
    expect(getPostHref('https://example.com/post')).toBe('https://example.com/post');
  });
});
