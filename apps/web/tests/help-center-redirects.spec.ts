import { expect, test } from '@playwright/test';

const permanentRedirectStatus = 301;
const okStatus = 200;
const notFoundStatus = 404;

const oneHopRedirects = [
  { from: '/help-center/guide/install-leather', to: '/support/install-leather' },
  { from: '/help-center/install-leather', to: '/support/install-leather' },
  {
    from: '/help-center/guide/what-is-stacks?query=value',
    to: '/posts/what-is-stacks?query=value',
  },
  { from: '/help-center/search?q=fees', to: '/support/search?q=fees' },
  { from: '/help-center/', to: '/support' },
  { from: '/guides/send-stacks-from-app', to: '/support/send-stx' },
  { from: '/support/guide/install-leather', to: '/support/install-leather' },
  { from: '/support/guide/what-is-stacks', to: '/posts/what-is-stacks' },
  { from: '/support/what-is-stacks', to: '/posts/what-is-stacks' },
  { from: '/posts/install-leather', to: '/support/install-leather' },
  {
    from: '/posts/send-ordinals',
    to: '/posts/deprecation-of-ordinals-inscriptions-support-in-leather',
  },
  { from: '/posts/apps-xlink', to: '/posts/brotocol' },
];

const notFoundPaths = [
  '/posts/no-such-post',
  '/support/no-such-guide',
  '/support/guide/no-such-guide',
  '/help-center/a/b',
];

const relativeUrlBase = 'http://localhost';

function getLocationPath(location: string) {
  const url = new URL(location, relativeUrlBase);
  return `${url.pathname}${url.search}`;
}

test.describe('Content redirects', () => {
  for (const { from, to } of oneHopRedirects) {
    test(`redirects ${from} to ${to} in one hop`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 });
      const location = response.headers()['location'] ?? '';

      expect(response.status()).toBe(permanentRedirectStatus);
      expect(getLocationPath(location)).toBe(to);

      const target = await request.get(to, { maxRedirects: 0 });
      expect(target.status()).toBe(okStatus);
    });
  }

  for (const path of notFoundPaths) {
    test(`returns 404 for ${path}`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });

      expect(response.status()).toBe(notFoundStatus);
    });
  }
});

test.describe('Marketing pages', () => {
  test('serves the home page without a redirect', async ({ request }) => {
    const response = await request.get('/', { maxRedirects: 0 });

    expect(response.status()).toBe(okStatus);
    expect(await response.text()).toContain('Buy.');
  });

  test('lists only absolute https://leather.io URLs in the sitemap', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    const xml = await response.text();
    const locations = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(([, location]) => location);

    expect(response.status()).toBe(okStatus);
    expect(locations.filter(location => !location.startsWith('https://leather.io/'))).toEqual([]);
    expect(locations).toContain('https://leather.io/');
  });
});
