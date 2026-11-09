import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import BigNumber from 'bignumber.js';

import { type Money } from '@leather.io/models';

type McpErrorCode =
  | 'NOT_PAIRED'
  | 'REQUEST_IN_FLIGHT'
  | 'REQUEST_NOT_FOUND'
  | 'ASSET_NOT_FOUND'
  | 'ASSET_AMBIGUOUS'
  | 'INVALID_INPUT'
  | 'NAME_NOT_FOUND'
  | 'QUOTE_NOT_FOUND'
  | 'QUOTE_NOT_EXECUTABLE'
  | 'UNSUPPORTED'
  | 'UPSTREAM_ERROR';

export class McpToolError extends Error {
  constructor(
    readonly code: McpErrorCode,
    message: string,
    readonly instructions: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
  }
}

function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === 'bigint') return value.toString();
  if (BigNumber.isBigNumber(value)) return value.toFixed();
  return value;
}

function textResult(payload: Record<string, unknown>, isError: boolean): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, jsonReplacer, 2) }],
    isError,
  };
}

export function toolResult(data: Record<string, unknown>, instructions: string) {
  return textResult({ ...data, instructions }, false);
}

function toolErrorResult(error: unknown) {
  if (error instanceof McpToolError) {
    return textResult(
      {
        error: { code: error.code, message: error.message, ...error.details },
        instructions: error.instructions,
      },
      true
    );
  }
  return textResult(
    {
      error: {
        code: 'UPSTREAM_ERROR',
        message: error instanceof Error ? error.message : 'Unexpected error',
      },
      instructions:
        'A data provider failed. Tell the user the lookup failed and try again later; do not guess values.',
    },
    true
  );
}

export async function runTool(handler: () => CallToolResult | Promise<CallToolResult>) {
  try {
    return await handler();
  } catch (error) {
    return toolErrorResult(error);
  }
}

export function formatMoney(money: Money) {
  return {
    amount: money.amount.shiftedBy(-money.decimals).toFixed(),
    symbol: money.symbol,
  };
}
