import type { McpContext } from '../server/mcp-context';
import { toolError } from './tool-result';

export function readPairedAccount({ pairingStore }: McpContext) {
  return pairingStore.get()?.account;
}

export function notPairedError() {
  return toolError(
    'NOT_PAIRED',
    'No Leather account is paired with this server.',
    'Call connect_wallet, give the user the connectUrl and pairing code, then call check_request until the request is approved.'
  );
}
