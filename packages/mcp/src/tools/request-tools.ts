import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { MAX_WAIT_SECONDS, MIN_WAIT_SECONDS } from '../constants';
import type { McpContext } from '../server/mcp-context';
import { describeRequest, getRequestInstructions } from './request-description';
import { toolError, toolResult } from './tool-result';

const millisecondsPerSecond = 1000;

function requestNotFound() {
  return toolError(
    'REQUEST_NOT_FOUND',
    'No request with this id exists.',
    'Requests live in memory and are lost when the server restarts. Create a new request if the user still wants it.'
  );
}

export function registerRequestTools(server: McpServer, { requestStore, baseUrl }: McpContext) {
  server.registerTool(
    'check_request',
    {
      description: `Reports the state of a connect or transaction request: pending, opened, approved, rejected, failed, expired or cancelled. Set waitSeconds (${MIN_WAIT_SECONDS}-${MAX_WAIT_SECONDS}) to wait and return as soon as the request finishes.`,
      inputSchema: {
        requestId: z.string().min(1),
        waitSeconds: z
          .number()
          .int()
          .min(MIN_WAIT_SECONDS)
          .max(MAX_WAIT_SECONDS)
          .optional()
          .describe('Wait up to this many seconds for the request to finish'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ requestId, waitSeconds }) => {
      const request = waitSeconds
        ? await requestStore.waitForTerminal(requestId, waitSeconds * millisecondsPerSecond)
        : requestStore.get(requestId);
      if (!request) return requestNotFound();
      return toolResult(describeRequest(baseUrl, request), getRequestInstructions(request));
    }
  );

  server.registerTool(
    'cancel_request',
    {
      description:
        'Cancels a connect or transaction request that is still waiting for the user, so its link stops working.',
      inputSchema: { requestId: z.string().min(1) },
    },
    ({ requestId }) => {
      const result = requestStore.cancel(requestId);
      if (!result.ok && result.reason === 'not-found') return requestNotFound();
      if (!result.ok) {
        return toolResult(
          describeRequest(baseUrl, result.request),
          `The request had already finished as ${result.request.state}, so it was not cancelled. ${getRequestInstructions(result.request)}`
        );
      }
      return toolResult(
        describeRequest(baseUrl, result.request),
        'The request is cancelled and its link no longer works. If the user had already approved it in Leather, check get_activity before proposing it again.'
      );
    }
  );
}
