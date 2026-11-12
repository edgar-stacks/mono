import { expect, test } from '@playwright/test';

const okStatus = 200;

test.describe('Marketing pages', () => {
  test('serves the marketing home at / without a redirect', async ({ request }) => {
    const response = await request.get('/', { maxRedirects: 0 });
    const body = await response.text();

    expect(response.status()).toBe(okStatus);
    expect(body).toContain('Leather is a wallet for Bitcoin and Stacks');
    expect(body).toContain('<link rel="canonical" href="https://leather.io/"');
  });

  for (const path of ['/apps', '/developers', '/news', '/posts', '/explorer']) {
    test(`serves ${path}`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(okStatus);
    });
  }

  test('serves robots.txt pointing at the sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');
    const body = await response.text();

    expect(response.status()).toBe(okStatus);
    expect(body).toContain('Allow: /');
    expect(body).toContain('Sitemap: https://leather.io/sitemap.xml');
  });

  test('lists only absolute https://leather.io URLs in the sitemap', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    const body = await response.text();
    const locations = [...body.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1] ?? '');

    expect(response.status()).toBe(okStatus);
    expect(locations).toContain('https://leather.io/');
    expect(locations).toContain('https://leather.io/apps');
    expect(locations.filter(location => !location.startsWith('https://leather.io/'))).toEqual([]);
  });

  test('returns a real 404 with the not-found page', async ({ request }) => {
    const response = await request.get('/no-such-page');
    const body = await response.text();

    expect(response.status()).toBe(404);
    expect(body).toContain('<title>404 – Leather</title>');
  });
});
