import type { BrowserContext, Page } from '@playwright/test';
import { z } from 'zod';

import { SBTC_EMILY_API_URL, TEST_ACCOUNT_1_STX_ADDRESS_HEX } from './constants';

const sbtcEmilyUrl = `${SBTC_EMILY_API_URL}/deposit*`;

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

const sbtcSponsorshipQuoteUrl = '**/v1/sponsorship/quote';
const sbtcSponsorshipSubmitUrl = '**/v1/sponsorship/submit';
const quoteLifetimeMs = 10 * 60 * 1000;

export const SBTC_SPONSOR_FEE_RECIPIENT = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

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
    quoteId: 'sbtc-sponsorship-quote-1',
    feeRecipientPrincipal: SBTC_SPONSOR_FEE_RECIPIENT,
    expiresAt: new Date(Date.now() + quoteLifetimeMs).toISOString(),
    satsPerStx: '1000000',
    minFeeSats: 100,
    maxFeeSats: 50_000,
    ...overrides,
  };
}

export async function mockSbtcSponsorshipQuotes(
  target: Page | BrowserContext,
  initialQuote: SbtcSponsorshipQuoteFixture = createSbtcSponsorshipQuoteFixture()
) {
  let currentQuote = initialQuote;
  await target.route(sbtcSponsorshipQuoteUrl, route => route.fulfill({ json: currentQuote }));
  return {
    use(quote: SbtcSponsorshipQuoteFixture) {
      currentQuote = quote;
    },
  };
}

const sbtcSponsorshipSubmitRequestSchema = z.object({
  quoteId: z.string(),
  transaction: z.string(),
});

type SbtcSponsorshipSubmitRequest = z.infer<typeof sbtcSponsorshipSubmitRequestSchema>;

interface SbtcSponsorshipSubmitErrorFixture {
  status: number;
  error: string;
  code: string;
  reason?: string;
}

export async function mockSbtcSponsorshipSubmit(
  target: Page | BrowserContext,
  {
    txid,
    errors = [],
  }: {
    txid: string;
    errors?: SbtcSponsorshipSubmitErrorFixture[];
  }
) {
  const requests: SbtcSponsorshipSubmitRequest[] = [];
  await target.route(sbtcSponsorshipSubmitUrl, route => {
    const body = sbtcSponsorshipSubmitRequestSchema.parse(route.request().postDataJSON());
    requests.push(body);
    const error = errors.at(requests.length - 1);
    if (error) {
      const { status, ...json } = error;
      return route.fulfill({ status, json });
    }
    return route.fulfill({ json: { txid, transaction: body.transaction } });
  });
  return requests;
}
