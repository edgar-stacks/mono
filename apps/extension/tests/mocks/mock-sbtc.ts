import type { BrowserContext, Page } from '@playwright/test';

import { SBTC_EMILY_API_URL, TEST_ACCOUNT_1_STX_ADDRESS_HEX } from './constants';

const sbtcEmilyUrl = `${SBTC_EMILY_API_URL}/deposit*`;
const sbtcSponsorshipQuoteUrl = '**/v1/sponsorship/quote';
const sbtcSponsorshipSubmitUrl = '**/v1/sponsorship/submit';
const quoteLifetimeMs = 10 * 60 * 1000;

export const SBTC_SPONSORED_TXID =
  'd1c3a1e5f1b8f0e2c6d3b6b1a5f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a291';

export interface SbtcSponsorshipQuoteFixture {
  quoteId: string;
  feeRecipientPrincipal: string;
  expiresAt: string;
  satsPerStx: string;
  minFeeSats: number;
  maxFeeSats: number;
}

export function createSbtcSponsorshipQuoteFixture(
  overrides: Partial<SbtcSponsorshipQuoteFixture> = {}
): SbtcSponsorshipQuoteFixture {
  return {
    quoteId: 'quote-1',
    feeRecipientPrincipal: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
    expiresAt: new Date(Date.now() + quoteLifetimeMs).toISOString(),
    satsPerStx: '250000',
    minFeeSats: 10,
    maxFeeSats: 100000,
    ...overrides,
  };
}

export async function mockSbtcSponsorshipQuotes(
  target: Page | BrowserContext,
  quotes: SbtcSponsorshipQuoteFixture[]
) {
  const remainingQuotes = [...quotes];
  await target.route(sbtcSponsorshipQuoteUrl, route => {
    const quote = remainingQuotes.length > 1 ? remainingQuotes.shift() : remainingQuotes[0];
    return route.fulfill({ json: quote });
  });
}

export async function mockSbtcSponsorshipSubmit(
  target: Page | BrowserContext,
  onSubmit?: (body: unknown) => void
) {
  await target.route(sbtcSponsorshipSubmitUrl, route => {
    const body: unknown = route.request().postDataJSON();
    onSubmit?.(body);
    const transaction =
      body && typeof body === 'object' && 'transaction' in body ? body.transaction : '';
    return route.fulfill({ json: { txid: SBTC_SPONSORED_TXID, transaction } });
  });
}

export type SbtcDepositStatus = 'pending' | 'accepted' | 'confirmed' | 'failed' | 'rbf';

export interface SbtcDepositFixture {
  amount: number;
  bitcoinTxOutputIndex: number;
  bitcoinTxid: string;
  depositScript: string;
  lastUpdateBlockHash: string;
  lastUpdateHeight: number;
  recipient: string;
  reclaimScript: string;
  status: SbtcDepositStatus;
}

interface CreateSbtcDepositFixtureArgs {
  bitcoinTxid: string;
  status: SbtcDepositStatus;
  amount?: number;
  recipient?: string;
}

export function createSbtcDepositFixture({
  bitcoinTxid,
  status,
  amount = 150_000,
  recipient = TEST_ACCOUNT_1_STX_ADDRESS_HEX,
}: CreateSbtcDepositFixtureArgs): SbtcDepositFixture {
  return {
    amount,
    bitcoinTxOutputIndex: 0,
    bitcoinTxid,
    depositScript: '0x00',
    lastUpdateBlockHash: '0x01',
    lastUpdateHeight: 810600,
    recipient,
    reclaimScript: '0x02',
    status,
  };
}

export async function mockMainnetTestAccountSbtcDepositRequests(page: Page | BrowserContext) {
  await page.route(sbtcEmilyUrl, route =>
    route.fulfill({
      json: {
        deposits: [],
      },
    })
  );

  await mockSbtcSponsorshipQuotes(page, [createSbtcSponsorshipQuoteFixture()]);
  await mockSbtcSponsorshipSubmit(page);
}

export async function mockSbtcDeposits(
  target: Page | BrowserContext,
  depositsByStatus: Partial<Record<SbtcDepositStatus, SbtcDepositFixture[]>>
) {
  await target.route(sbtcEmilyUrl, route => {
    const status = new URL(route.request().url()).searchParams.get('status');
    const deposits = Object.entries(depositsByStatus).find(([key]) => key === status)?.[1] ?? [];
    return route.fulfill({ json: { deposits } });
  });
}
