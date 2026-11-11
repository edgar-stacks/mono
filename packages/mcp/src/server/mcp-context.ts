import type { PairingStore } from '../pairing/pairing-store';
import type { PendingRequestStore } from '../requests/pending-request-store';
import type { SwapQuoteCache } from '../swap/swap-quote-cache';

export interface McpContext {
  baseUrl: string;
  pairingStore: PairingStore;
  requestStore: PendingRequestStore;
  swapQuoteCache: SwapQuoteCache;
}
