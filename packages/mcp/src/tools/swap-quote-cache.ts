import { randomUUID } from 'node:crypto';

import { type SwapQuote } from '@leather.io/models';

import { SWAP_QUOTE_TTL_MS } from '../constants';

interface CachedSwapQuote {
  quote: SwapQuote;
  expiresAt: number;
}

export class SwapQuoteCache {
  private readonly quotes = new Map<string, CachedSwapQuote>();

  constructor(
    private readonly ttlMs = SWAP_QUOTE_TTL_MS,
    private readonly now: () => number = () => Date.now()
  ) {}

  add(quote: SwapQuote) {
    this.prune();
    const quoteId = randomUUID();
    const expiresAt = this.now() + this.ttlMs;
    this.quotes.set(quoteId, { quote, expiresAt });
    return { quoteId, expiresAt };
  }

  get(quoteId: string) {
    this.prune();
    return this.quotes.get(quoteId)?.quote;
  }

  private prune() {
    const now = this.now();
    for (const [quoteId, cached] of this.quotes) {
      if (cached.expiresAt <= now) this.quotes.delete(quoteId);
    }
  }
}
