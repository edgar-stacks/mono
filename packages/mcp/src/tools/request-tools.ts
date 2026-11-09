import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { MAX_WAIT_SECONDS, MIN_WAIT_SECONDS } from '../constants';
import { type McpContext } from '../context';
import { presentRequest } from '../requests/request-presenter';
import { McpToolError, runTool, toolResult } from './tool-result';

const millisecondsPerSecond = 1000;

function requestNotFound(requestId: string) {
  return new McpToolError(
    'REQUEST_NOT_FOUND',
    `No request with id ${requestId}.`,
    'Requests live only in memory and are lost when the server restarts. Propose the action again if the user still wants it.'
  );
}

export function registerRequestTools(server: McpServer, context: McpContext) {
  const { requestStore, baseUrl } = context;

  server.registerTool(
    'check_request',
    {
      description:
        'Reports the state of a connect or transaction request: pending, opened, approved, rejected, failed, expired or cancelled. Set waitSeconds to wait until the request reaches a final state, returning as soon as it does.',
      inputSchema: {
        requestId: z.string().describe('The requestId a connect or propose tool returned'),
        waitSeconds: z
          .number()
          .int()
          .min(MIN_WAIT_SECONDS)
          .max(MAX_WAIT_SECONDS)
          .optional()
          .describe(`Wait up to this many seconds (${MIN_WAIT_SECONDS}–${MAX_WAIT_SECONDS})`),
      },
      annotations: { readOnlyHint: true },
    },
    ({ requestId, waitSeconds }) =>
      runTool(async () => {
        const request = waitSeconds
          ? await requestStore.waitForTerminal(requestId, waitSeconds * millisecondsPerSecond)
          : requestStore.get(requestId);
        if (!request) throw requestNotFound(requestId);
        const { data, instructions } = presentRequest(request, baseUrl);
        return toolResult(data, instructions);
      })
  );

  server.registerTool(
    'cancel_request',
    {
      description:
        'Cancels an open connect or transaction request so its link stops working. A transaction the user already approved in Leather cannot be cancelled.',
      inputSchema: { requestId: z.string() },
    },
    ({ requestId }) =>
      runTool(() => {
        const request = requestStore.cancel(requestId);
        if (!request) throw requestNotFound(requestId);
        const { data, instructions } = presentRequest(request, baseUrl);
        return toolResult(data, instructions);
      })
  );
}
