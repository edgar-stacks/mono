import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { toJsonSafe } from './to-json-safe';

type ToolErrorCode =
  | 'NOT_PAIRED'
  | 'REQUEST_IN_FLIGHT'
  | 'REQUEST_NOT_FOUND'
  | 'ASSET_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'QUOTE_NOT_FOUND'
  | 'UNSUPPORTED'
  | 'UPSTREAM_ERROR';

function toText(payload: Record<string, unknown>) {
  return JSON.stringify(toJsonSafe(payload), null, 2);
}

export function toolResult(data: Record<string, unknown>, instructions: string): CallToolResult {
  return { content: [{ type: 'text', text: toText({ ...data, instructions }) }] };
}

export function toolError(
  code: ToolErrorCode,
  message: string,
  instructions: string,
  data: Record<string, unknown> = {}
): CallToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: toText({ error: { code, message }, ...data, instructions }) }],
  };
}

export function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function upstreamError(error: unknown): CallToolResult {
  return toolError(
    'UPSTREAM_ERROR',
    readErrorMessage(error),
    'A data provider failed. Tell the user the data is temporarily unavailable and try again later; do not guess values.'
  );
}
