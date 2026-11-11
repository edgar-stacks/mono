import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { CreatePendingRequestInput } from '../requests/pending-request-store';
import type { McpContext } from '../server/mcp-context';
import { describeRequest, getRequestInstructions } from './request-description';
import { toolError, toolResult } from './tool-result';

export function proposeRequest(
  { baseUrl, requestStore }: McpContext,
  input: CreatePendingRequestInput,
  instructions: string
): CallToolResult {
  const created = requestStore.create(input);
  if (!created.ok) {
    return toolError(
      'REQUEST_IN_FLIGHT',
      'Another request of this kind is still waiting for the user.',
      `Only one ${input.requestClass} request can be open at a time. Ask the user to finish the open one at its link, wait for it with check_request, or call cancel_request with its requestId before creating a new one.`,
      { inFlight: describeRequest(baseUrl, created.inFlight) }
    );
  }
  return toolResult(
    describeRequest(baseUrl, created.request),
    `${instructions} ${getRequestInstructions(created.request)}`
  );
}
