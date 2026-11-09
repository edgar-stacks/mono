import { randomUUID } from 'node:crypto';

import { type SwapQuote } from '@leather.io/models';

interface CachedSwapQuote {
  quote: SwapQuote;
  cachedAt: number;
}

type SwapQuoteLookup =
  | { status: 'found'; quote: SwapQuote }
  | { status: 'expired' }
  | { status: 'missing' };

export class SwapQuoteCache {
  private readonly quotes = new Map<string, CachedSwapQuote>();

  constructor(private readonly ttlMs: number) {}

  add(quote: SwapQuote) {
    this.prune();
    const quoteId = randomUUID();
    this.quotes.set(quoteId, { quote, cachedAt: Date.now() });
    return quoteId;
  }

  get(quoteId: string): SwapQuoteLookup {
    const cached = this.quotes.get(quoteId);
    if (!cached) return { status: 'missing' };
    if (this.isExpired(cached)) {
      this.quotes.delete(quoteId);
      return { status: 'expired' };
    }
    return { status: 'found', quote: cached.quote };
  }

  private isExpired(cached: CachedSwapQuote) {
    return Date.now() - cached.cachedAt >= this.ttlMs;
  }

  private prune() {
    this.quotes.forEach((cached, quoteId) => {
      if (this.isExpired(cached)) this.quotes.delete(quoteId);
    });
  }
}
