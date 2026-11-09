import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { MAX_WAIT_SECONDS, MIN_WAIT_SECONDS } from '../constants';
import { describeRequest } from '../requests/describe-request';
import { type ServerContext } from '../server-context';
import { toolError, toolResult } from './tool-result';

const requestNotFoundInstructions =
  'The server does not know this request. Requests live in memory, last 10 minutes and do not survive a restart. Propose it again if the user still wants it.';

export function registerRequestTools(server: McpServer, context: ServerContext) {
  server.registerTool(
    'check_request',
    {
      title: 'Check request',
      description:
        'Check the state of a connect or transaction request. Pass waitSeconds (1–50) to wait until the user finishes in Leather; it returns as soon as the request is approved, rejected, failed, expired or cancelled.',
      inputSchema: {
        requestId: z
          .string()
          .describe('The requestId returned by connect_wallet or a propose tool'),
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
        ? await context.requests.waitForTerminal(requestId, waitSeconds * 1000)
        : context.requests.get(requestId);
      if (!request) {
        return toolError('REQUEST_NOT_FOUND', 'Request not found.', requestNotFoundInstructions);
      }
      const { payload, instructions } = describeRequest(context.baseUrl, request);
      return toolResult(payload, instructions);
    }
  );

  server.registerTool(
    'cancel_request',
    {
      title: 'Cancel request',
      description:
        'Cancel a pending connect or transaction request so its approval link stops working. A transaction the user already approved in Leather cannot be cancelled here.',
      inputSchema: {
        requestId: z.string().describe('The requestId to cancel'),
      },
      annotations: { destructiveHint: false },
    },
    ({ requestId }) => {
      const existing = context.requests.get(requestId);
      if (!existing) {
        return toolError('REQUEST_NOT_FOUND', 'Request not found.', requestNotFoundInstructions);
      }
      const cancelled = context.requests.cancel(requestId);
      const { payload } = describeRequest(context.baseUrl, cancelled ?? existing);
      return toolResult(
        payload,
        cancelled
          ? 'The request is cancelled and its link no longer works. Tell the user that if a Leather window is still open for it, they should close or reject it.'
          : 'The request had already finished, so nothing was cancelled. Report its status to the user.'
      );
    }
  );
}
