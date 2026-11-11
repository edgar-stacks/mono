import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';
import { z } from 'zod';

import { APPROVAL_HOST, MCP_SERVER_NAME, MCP_SERVER_VERSION } from '../constants';
import { renderNotFoundPage, renderRequestPage } from '../pages/render-request-page';
import {
  type PendingRequest,
  type PendingRequestOutcome,
  type PendingRequestStore,
  isTerminalState,
} from '../requests/pending-request-store';

const maxBodyBytes = 1024 * 1024;

const requestResultBodySchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('approved'), result: z.unknown() }),
  z.object({
    status: z.enum(['rejected', 'failed']),
    error: z.object({ code: z.number().optional(), message: z.string() }),
  }),
]);

const pageRoutePattern = /^\/(connect|approve)\/([^/]+)$/;
const requestRoutePattern = /^\/api\/requests\/([^/]+)$/;
const resultRoutePattern = /^\/api\/requests\/([^/]+)\/result$/;

interface ApprovalServerOptions {
  port: number;
  store: PendingRequestStore;
  readBridgeScript(): Promise<string>;
  resolveApprovedOutcome(request: PendingRequest, result: unknown): Promise<PendingRequestOutcome>;
}

export interface ApprovalServer {
  baseUrl: string;
  close(): Promise<void>;
}

const baseHeaders = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

function send(response: ServerResponse, status: number, contentType: string, body: string) {
  response.writeHead(status, { ...baseHeaders, 'Content-Type': contentType });
  response.end(body);
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  send(response, status, 'application/json; charset=utf-8', JSON.stringify(body));
}

function sendHtml(response: ServerResponse, status: number, body: string) {
  send(response, status, 'text/html; charset=utf-8', body);
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.length;
    if (size > maxBodyBytes) return undefined;
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function toPublicRequest(request: PendingRequest) {
  return {
    id: request.id,
    kind: request.kind,
    state: request.state,
    title: request.title,
    summary: request.summary,
    pairingCode: request.pairingCode,
    rpcMethod: request.rpcMethod,
    rpcParams: request.rpcParams,
    expiresAt: new Date(request.expiresAt).toISOString(),
  };
}

export function startApprovalServer({
  port,
  store,
  readBridgeScript,
  resolveApprovedOutcome,
}: ApprovalServerOptions): Promise<ApprovalServer> {
  const allowedHosts = new Set([`${APPROVAL_HOST}:${port}`, `localhost:${port}`]);
  const allowedOrigins = new Set([...allowedHosts].map(host => `http://${host}`));

  async function handleResult(request: IncomingMessage, response: ServerResponse, id: string) {
    const origin = request.headers.origin;
    if (!origin || !allowedOrigins.has(origin)) {
      return sendJson(response, 403, { error: 'FORBIDDEN_ORIGIN' });
    }
    if (!request.headers['content-type']?.startsWith('application/json')) {
      return sendJson(response, 415, { error: 'UNSUPPORTED_MEDIA_TYPE' });
    }
    const text = await readBody(request);
    if (text === undefined) return sendJson(response, 413, { error: 'BODY_TOO_LARGE' });
    const body = requestResultBodySchema.safeParse(parseJson(text));
    if (!body.success) return sendJson(response, 400, { error: 'INVALID_BODY' });

    const pendingRequest = store.get(id);
    if (!pendingRequest) return sendJson(response, 404, { error: 'REQUEST_NOT_FOUND' });
    if (isTerminalState(pendingRequest.state)) {
      return sendJson(response, 410, { state: pendingRequest.state });
    }

    const outcome: PendingRequestOutcome =
      body.data.status === 'approved'
        ? await resolveApprovedOutcome(pendingRequest, body.data.result)
        : { state: body.data.status, error: body.data.error };
    const updated = store.complete(id, outcome);
    if (!updated.ok) {
      return sendJson(response, updated.reason === 'not-found' ? 404 : 410, {
        error: updated.reason,
      });
    }
    return sendJson(response, 200, { state: updated.request.state });
  }

  async function handle(request: IncomingMessage, response: ServerResponse) {
    if (!request.headers.host || !allowedHosts.has(request.headers.host)) {
      return sendJson(response, 403, { error: 'FORBIDDEN_HOST' });
    }
    const { pathname } = new URL(request.url ?? '/', `http://${request.headers.host}`);
    const method = request.method ?? 'GET';

    if (method === 'GET' && pathname === '/health') {
      return sendJson(response, 200, {
        ok: true,
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION,
      });
    }

    if (method === 'GET' && pathname === '/bridge.js') {
      return send(response, 200, 'text/javascript; charset=utf-8', await readBridgeScript());
    }

    const pageMatch = pageRoutePattern.exec(pathname);
    if (method === 'GET' && pageMatch?.[2]) {
      const pendingRequest = store.get(decodeURIComponent(pageMatch[2]));
      const expectedPage = pendingRequest?.kind === 'connect' ? 'connect' : 'approve';
      if (!pendingRequest || pageMatch[1] !== expectedPage) {
        return sendHtml(response, 404, renderNotFoundPage());
      }
      return sendHtml(response, 200, renderRequestPage(pendingRequest));
    }

    const requestMatch = requestRoutePattern.exec(pathname);
    if (method === 'GET' && requestMatch?.[1]) {
      const result = store.markOpened(decodeURIComponent(requestMatch[1]));
      if (result.ok) return sendJson(response, 200, toPublicRequest(result.request));
      if (result.reason === 'terminal') {
        return sendJson(response, 410, { state: result.request.state });
      }
      return sendJson(response, 404, { error: 'REQUEST_NOT_FOUND' });
    }

    const resultMatch = resultRoutePattern.exec(pathname);
    if (method === 'POST' && resultMatch?.[1]) {
      return handleResult(request, response, decodeURIComponent(resultMatch[1]));
    }

    return sendJson(response, 404, { error: 'NOT_FOUND' });
  }

  const server = createServer((request, response) => {
    handle(request, response).catch(() => {
      if (!response.headersSent) sendJson(response, 500, { error: 'INTERNAL_ERROR' });
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, APPROVAL_HOST, () => {
      server.off('error', reject);
      resolve({
        baseUrl: `http://${APPROVAL_HOST}:${port}`,
        close() {
          return new Promise<void>((resolveClose, rejectClose) =>
            server.close(error => (error ? rejectClose(error) : resolveClose()))
          );
        },
      });
    });
  });
}
