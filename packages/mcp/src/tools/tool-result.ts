import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { stringifyJson } from '../format/stringify-json';

type ToolErrorCode =
  | 'NOT_PAIRED'
  | 'REQUEST_IN_FLIGHT'
  | 'REQUEST_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'ASSET_NOT_FOUND'
  | 'QUOTE_NOT_FOUND'
  | 'QUOTE_EXPIRED'
  | 'UNSUPPORTED'
  | 'UPSTREAM_ERROR';

export function toolResult(payload: Record<string, unknown>, instructions: string): CallToolResult {
  return {
    content: [{ type: 'text', text: stringifyJson({ ...payload, instructions }) }],
  };
}

export function toolError(
  code: ToolErrorCode,
  message: string,
  instructions: string
): CallToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: stringifyJson({ error: { code, message }, instructions }) }],
  };
}

export const notPairedInstructions =
  'No Leather account is paired. Call connect_wallet, give the user the connectUrl and pairing code, then poll check_request until it is approved.';

export function notPairedError() {
  return toolError('NOT_PAIRED', 'No Leather account is paired.', notPairedInstructions);
}

export function upstreamError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return toolError(
    'UPSTREAM_ERROR',
    message,
    'A data provider failed. Tell the user the data is unavailable right now and try again later; do not guess values.'
  );
}
