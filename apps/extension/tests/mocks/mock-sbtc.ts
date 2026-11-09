import type { BrowserContext, Page } from '@playwright/test';

import {
  SBTC_EMILY_API_URL,
  TEST_ACCOUNT_1_STX_ADDRESS_HEX,
  TEST_MULTISIG_ACCOUNTS_3_1_STX_ADDRESS,
} from './constants';

const sbtcEmilyUrl = `${SBTC_EMILY_API_URL}/deposit*`;
const sbtcSponsorshipQuoteUrl = '**/v1/sponsorship/quote';
const sbtcSponsorshipSubmitUrl = '**/v1/sponsorship/submit';
const quoteLifetimeMs = 5 * 60 * 1000;

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

  await mockSbtcSponsorshipQuotes(page);
  await mockSbtcSponsorshipSubmit(page);
}

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
    quoteId: 'sbtc-quote-1',
    feeRecipientPrincipal: TEST_MULTISIG_ACCOUNTS_3_1_STX_ADDRESS,
    expiresAt: new Date(Date.now() + quoteLifetimeMs).toISOString(),
    satsPerStx: '1000',
    minFeeSats: 100,
    maxFeeSats: 100_000,
    ...overrides,
  };
}

export async function mockSbtcSponsorshipQuotes(
  target: Page | BrowserContext,
  quotes: SbtcSponsorshipQuoteFixture[] = [createSbtcSponsorshipQuoteFixture()]
) {
  const requestedQuotes: SbtcSponsorshipQuoteFixture[] = [];
  await target.unroute(sbtcSponsorshipQuoteUrl);
  await target.route(sbtcSponsorshipQuoteUrl, route => {
    const quote = quotes[Math.min(requestedQuotes.length, quotes.length - 1)];
    requestedQuotes.push(quote);
    return route.fulfill({ json: quote });
  });
  return requestedQuotes;
}

export interface SbtcSponsorshipSubmitFixture {
  status: number;
  json: unknown;
}

export const sbtcSponsorshipSubmitTxid =
  '9b709768122e6c62a37b087106cc9c23280ed6242b565484b6cc4e6a43ae1155';

export async function mockSbtcSponsorshipSubmit(
  target: Page | BrowserContext,
  responses: SbtcSponsorshipSubmitFixture[] = []
) {
  const submittedBodies: unknown[] = [];
  await target.unroute(sbtcSponsorshipSubmitUrl);
  await target.route(sbtcSponsorshipSubmitUrl, route => {
    const body: unknown = route.request().postDataJSON();
    const response = responses[submittedBodies.length];
    submittedBodies.push(body);
    if (response) return route.fulfill({ status: response.status, json: response.json });
    const transaction =
      body && typeof body === 'object' && 'transaction' in body ? body.transaction : '';
    return route.fulfill({ json: { txid: sbtcSponsorshipSubmitTxid, transaction } });
  });
  return submittedBodies;
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
