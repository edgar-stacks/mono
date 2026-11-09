import type { BrowserContext, Page } from '@playwright/test';
import { z } from 'zod';

import { SBTC_EMILY_API_URL, TEST_ACCOUNT_1_STX_ADDRESS_HEX } from './constants';

const sbtcEmilyUrl = `${SBTC_EMILY_API_URL}/deposit*`;
const sbtcSponsorshipQuoteUrl = '**/v1/sponsorship/quote';
const sbtcSponsorshipSubmitUrl = '**/v1/sponsorship/submit';

export const sbtcSponsoredTxid =
  '0x5bd8e47b39fbd5c3b1a4a2e1b0c8b5bd7e3d58e1f2c7f0b6c7f6bba9c48ca1f2';

export function createSbtcSponsorshipQuoteFixture(quoteId = 'quote-1') {
  return {
    quoteId,
    feeRecipientPrincipal: 'SP000000000000000000002Q6VF78',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    satsPerStx: '25000',
    minFeeSats: 1,
    maxFeeSats: 1000,
  };
}

const sbtcSponsorshipSubmitRequestSchema = z.object({
  quoteId: z.string(),
  transaction: z.string(),
});

type SbtcSponsorshipSubmitRequest = z.infer<typeof sbtcSponsorshipSubmitRequestSchema>;

interface MockSbtcSponsorshipRequestsOptions {
  rejectFirstSubmitWithCode?: string;
}

export async function mockSbtcSponsorshipRequests(
  target: Page | BrowserContext,
  { rejectFirstSubmitWithCode }: MockSbtcSponsorshipRequestsOptions = {}
) {
  const quoteRequests: unknown[] = [];
  const submitRequests: SbtcSponsorshipSubmitRequest[] = [];

  await target.route(sbtcSponsorshipQuoteUrl, route => {
    quoteRequests.push(route.request().postDataJSON());
    return route.fulfill({
      json: createSbtcSponsorshipQuoteFixture(`quote-${quoteRequests.length}`),
    });
  });

  await target.route(sbtcSponsorshipSubmitUrl, route => {
    const parsed = sbtcSponsorshipSubmitRequestSchema.safeParse(route.request().postDataJSON());
    if (!parsed.success) return route.fulfill({ status: 400, json: {} });
    const body = parsed.data;
    submitRequests.push(body);
    if (rejectFirstSubmitWithCode && submitRequests.length === 1) {
      return route.fulfill({
        status: 409,
        json: { error: 'Quote expired', code: rejectFirstSubmitWithCode },
      });
    }
    return route.fulfill({ json: { txid: sbtcSponsoredTxid, transaction: body.transaction } });
  });

  return { quoteRequests, submitRequests };
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

  await mockSbtcSponsorshipRequests(page);
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
