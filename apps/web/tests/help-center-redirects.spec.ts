import { type APIRequestContext, expect, test } from '@playwright/test';

const permanentRedirectStatus = 301;
const okStatus = 200;
const notFoundStatus = 404;
const goneStatus = 410;

const oneHopRedirects = [
  { from: '/help-center/guide/install-leather', to: '/support/install-leather' },
  { from: '/help-center/install-leather', to: '/support/install-leather' },
  {
    from: '/help-center/guide/what-is-stacks?query=value',
    to: '/posts/what-is-stacks?query=value',
  },
  { from: '/help-center/search?q=fees', to: '/support/search?q=fees' },
  { from: '/help-center/', to: '/support' },
  { from: '/help-center', to: '/support' },
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
  { from: '/wallet/mobile', to: '/' },
  { from: '/terms', to: '/posts/terms-of-service' },
  { from: '/security', to: '/support/security' },
];

const notFoundPaths = [
  '/posts/no-such-post',
  '/support/no-such-guide',
  '/support/guide/no-such-guide',
  '/help-center/a/b',
];

async function getWithoutRedirects(request: APIRequestContext, path: string) {
  return request.get(path, { maxRedirects: 0 });
}

test.describe('Content slug redirects', () => {
  for (const { from, to } of oneHopRedirects) {
    test(`redirects ${from} to ${to} in one hop`, async ({ request }) => {
      const response = await getWithoutRedirects(request, from);
      const location = response.headers()['location'] ?? '';
      const target = new URL(location, 'http://localhost');

      expect(response.status()).toBe(permanentRedirectStatus);
      expect(`${target.pathname}${target.search}`).toBe(to);

      const targetResponse = await getWithoutRedirects(request, to);
      expect(targetResponse.status()).toBe(okStatus);
    });
  }

  for (const path of notFoundPaths) {
    test(`returns 404 for ${path}`, async ({ request }) => {
      const response = await getWithoutRedirects(request, path);
      expect(response.status()).toBe(notFoundStatus);
    });
  }

  test('returns 410 for a retired slug', async ({ request }) => {
    const response = await getWithoutRedirects(request, '/posts/befi-labs');
    expect(response.status()).toBe(goneStatus);
  });
});

test.describe('Marketing and SEO routes', () => {
  test('serves the marketing home without a redirect', async ({ request }) => {
    const response = await getWithoutRedirects(request, '/');
    expect(response.status()).toBe(okStatus);
    expect(await response.text()).toContain('Leather is a wallet for Bitcoin and Stacks');
  });

  test('lists only absolute leather.io URLs in the sitemap', async ({ request }) => {
    const response = await getWithoutRedirects(request, '/sitemap.xml');
    expect(response.status()).toBe(okStatus);
    const locs = [...(await response.text()).matchAll(/<loc>([^<]*)<\/loc>/g)].map(
      match => match[1] ?? ''
    );
    expect(locs).toContain('https://leather.io/');
    expect(locs.filter(loc => !loc.startsWith('https://leather.io/'))).toEqual([]);
  });

  test('serves robots.txt pointing at the sitemap', async ({ request }) => {
    const response = await getWithoutRedirects(request, '/robots.txt');
    expect(response.status()).toBe(okStatus);
    expect(await response.text()).toContain('Sitemap: https://leather.io/sitemap.xml');
  });

  test('returns 404 for unknown pages', async ({ request }) => {
    const response = await getWithoutRedirects(request, '/no-such-page');
    expect(response.status()).toBe(notFoundStatus);
  });
});
