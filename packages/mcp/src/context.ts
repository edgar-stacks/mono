import { type PairingStore } from './pairing/pairing-store';
import { type PendingRequestStore } from './requests/pending-request-store';
import { type SwapQuoteCache } from './tools/swap-quote-cache';

export interface McpContext {
  readonly baseUrl: string;
  readonly pairingStore: PairingStore;
  readonly requestStore: PendingRequestStore;
  readonly swapQuoteCache: SwapQuoteCache;
}
