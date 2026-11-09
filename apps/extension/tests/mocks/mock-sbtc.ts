import type { BrowserContext, Page } from '@playwright/test';

import { SBTC_EMILY_API_URL, TEST_ACCOUNT_1_STX_ADDRESS_HEX } from './constants';

const sbtcEmilyUrl = `${SBTC_EMILY_API_URL}/deposit*`;
const sbtcSponsorshipQuoteUrl = '**/v1/sponsorship/quote';
const sbtcSponsorshipSubmitUrl = '**/v1/sponsorship/submit';
const quoteLifetimeMs = 5 * 60 * 1000;

export const SBTC_SPONSORSHIP_FEE_RECIPIENT = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
export const SBTC_SPONSORED_TXID =
  '0x4a0e5d4ff9a2f2b8c3c1e0b6f2a75c9e3d8e1f0a2b3c4d5e6f708192a3b4c5d6';

interface SbtcSponsorshipQuoteFixtureArgs {
  quoteId?: string;
  expiresAt?: string;
}

export function createSbtcSponsorshipQuoteFixture({
  quoteId = 'quote-1',
  expiresAt = new Date(Date.now() + quoteLifetimeMs).toISOString(),
}: SbtcSponsorshipQuoteFixtureArgs = {}) {
  return {
    quoteId,
    feeRecipientPrincipal: SBTC_SPONSORSHIP_FEE_RECIPIENT,
    expiresAt,
    satsPerStx: '2500',
    minFeeSats: 1,
    maxFeeSats: 1_000_000,
  };
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

  await mockSbtcSponsorship(page);
}

export async function mockSbtcSponsorshipQuote(
  target: Page | BrowserContext,
  quote = createSbtcSponsorshipQuoteFixture()
) {
  await target.unroute(sbtcSponsorshipQuoteUrl);
  await target.route(sbtcSponsorshipQuoteUrl, route => route.fulfill({ json: quote }));
}

interface MockSbtcSponsorshipSubmitArgs {
  errorCodes?: string[];
}

export async function mockSbtcSponsorshipSubmit(
  target: Page | BrowserContext,
  { errorCodes = [] }: MockSbtcSponsorshipSubmitArgs = {}
) {
  const pendingErrorCodes = [...errorCodes];
  await target.unroute(sbtcSponsorshipSubmitUrl);
  await target.route(sbtcSponsorshipSubmitUrl, route => {
    const errorCode = pendingErrorCodes.shift();
    if (errorCode) {
      return route.fulfill({ status: 409, json: { error: errorCode, code: errorCode } });
    }
    const body: unknown = route.request().postDataJSON();
    const transaction =
      body && typeof body === 'object' && 'transaction' in body ? body.transaction : '';
    return route.fulfill({ json: { txid: SBTC_SPONSORED_TXID, transaction } });
  });
}

export async function mockSbtcSponsorship(target: Page | BrowserContext) {
  await mockSbtcSponsorshipQuote(target);
  await mockSbtcSponsorshipSubmit(target);
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
