import { randomUUID } from 'node:crypto';

import type { SwapQuote } from '@leather.io/models';

interface CachedSwapQuote {
  quote: SwapQuote;
  expiresAt: number;
}

export class SwapQuoteCache {
  private readonly quotes = new Map<string, CachedSwapQuote>();

  constructor(private readonly ttlMs: number) {}

  add(quote: SwapQuote) {
    this.prune();
    const quoteId = randomUUID();
    this.quotes.set(quoteId, { quote, expiresAt: Date.now() + this.ttlMs });
    return quoteId;
  }

  get(quoteId: string): SwapQuote | undefined {
    this.prune();
    return this.quotes.get(quoteId)?.quote;
  }

  private prune() {
    const now = Date.now();
    for (const [quoteId, cached] of this.quotes) {
      if (cached.expiresAt <= now) this.quotes.delete(quoteId);
    }
  }
}
