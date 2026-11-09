import type { BrowserContext, Page } from '@playwright/test';

export async function mockMainnetTestAccountStacksNFTsRequest(page: Page | BrowserContext) {
  await page.route('**hiro.so/extended/v3/principals/*/balances/nft**', route =>
    route.fulfill({
      json: {
        limit: 200,
        total: 0,
        cursor: { next: null, previous: null, current: null },
        results: [],
      },
    })
  );
}
