import { readFile } from 'node:fs/promises';
import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  APPROVAL_HOST,
  BRIDGE_SCRIPT_DIRECTORY,
  BRIDGE_SCRIPT_FILE_NAME,
  LEATHER_MCP_NAME,
  LEATHER_MCP_VERSION,
} from '../constants';
import { type McpContext } from '../context';
import { renderApprovalPage, renderMessagePage } from '../pages/approval-page';
import { acceptsLateApproval, isTerminalRequestState } from '../requests/request.types';
import { bridgeOutcomeSchema, settleRequest } from './settle-request';

const maxBodyBytes = 1024 * 1024;

const pageContentSecurityPolicy =
  "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const pageRouteRegex = /^\/(connect|approve)\/([\w-]+)$/;
const requestRouteRegex = /^\/api\/requests\/([\w-]+)$/;
const resultRouteRegex = /^\/api\/requests\/([\w-]+)\/result$/;

export function getBaseUrl(port: number) {
  return `http://${APPROVAL_HOST}:${port}`;
}

function getAllowedHosts(port: number) {
  return [`${APPROVAL_HOST}:${port}`, `localhost:${port}`];
}

function send(
  response: ServerResponse,
  status: number,
  body: string,
  contentType: string,
  headers: Record<string, string> = {}
) {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...headers,
  });
  response.end(body);
}

function sendJson(response: ServerResponse, status: number, body: Record<string, unknown>) {
  send(response, status, JSON.stringify(body), 'application/json; charset=utf-8');
}

function sendHtml(response: ServerResponse, status: number, html: string) {
  send(response, status, html, 'text/html; charset=utf-8', {
    'Content-Security-Policy': pageContentSecurityPolicy,
    'X-Frame-Options': 'DENY',
  });
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.length;
    if (size > maxBodyBytes) return undefined;
    chunks.push(buffer);
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
    return parsed;
  } catch {
    return undefined;
  }
}

async function readBridgeScript() {
  const directory = dirname(fileURLToPath(import.meta.url));
  try {
    return await readFile(
      join(directory, BRIDGE_SCRIPT_DIRECTORY, BRIDGE_SCRIPT_FILE_NAME),
      'utf-8'
    );
  } catch {
    return undefined;
  }
}

function handlePage(context: McpContext, response: ServerResponse, kind: string, id: string) {
  const request = context.requestStore.get(id);
  const expectedClass = kind === 'connect' ? 'connect' : 'transaction';
  if (!request || request.requestClass !== expectedClass) {
    return sendHtml(
      response,
      404,
      renderMessagePage('Request not found', 'Ask your agent for a new link.')
    );
  }
  sendHtml(
    response,
    200,
    renderApprovalPage({
      requestId: request.id,
      title: expectedClass === 'connect' ? 'Connect Leather to your agent' : 'Approve transaction',
      summary: request.summary,
      pairingCode: request.pairingCode,
    })
  );
}

function handleGetRequest(context: McpContext, response: ServerResponse, id: string) {
  const request = context.requestStore.markOpened(id);
  if (!request) return sendJson(response, 404, { error: 'Request not found' });
  if (isTerminalRequestState(request.state)) {
    return sendJson(response, 410, { state: request.state });
  }
  sendJson(response, 200, {
    id: request.id,
    state: request.state,
    rpcMethod: request.rpcMethod,
    rpcParams: request.rpcParams,
  });
}

async function handlePostResult(
  context: McpContext,
  request: IncomingMessage,
  response: ServerResponse,
  id: string,
  allowedOrigins: string[]
) {
  const { origin } = request.headers;
  if (!origin || !allowedOrigins.includes(origin)) {
    return sendJson(response, 403, { error: 'Forbidden origin' });
  }
  if (!request.headers['content-type']?.startsWith('application/json')) {
    return sendJson(response, 415, { error: 'Expected application/json' });
  }
  const outcome = bridgeOutcomeSchema.safeParse(await readJsonBody(request));
  if (!outcome.success) return sendJson(response, 400, { error: 'Invalid outcome' });

  const existing = context.requestStore.get(id);
  if (!existing) return sendJson(response, 404, { error: 'Request not found' });
  if (isTerminalRequestState(existing.state) && !acceptsLateApproval(existing)) {
    return sendJson(response, 410, { state: existing.state });
  }
  const settled = await settleRequest(context, id, outcome.data);
  sendJson(response, 200, { state: settled?.state });
}

export function createApprovalServer(context: McpContext, port: number): Server {
  const allowedHosts = getAllowedHosts(port);
  const allowedOrigins = allowedHosts.map(host => `http://${host}`);
  const bridgeScript = readBridgeScript();

  async function handle(request: IncomingMessage, response: ServerResponse) {
    const { host } = request.headers;
    if (!host || !allowedHosts.includes(host)) {
      return sendJson(response, 421, { error: 'Unexpected host' });
    }
    const { pathname } = new URL(request.url ?? '/', getBaseUrl(port));
    const method = request.method ?? 'GET';

    if (method === 'GET' && pathname === '/health') {
      return sendJson(response, 200, {
        status: 'ok',
        name: LEATHER_MCP_NAME,
        version: LEATHER_MCP_VERSION,
      });
    }

    if (method === 'GET' && pathname === `/${BRIDGE_SCRIPT_FILE_NAME}`) {
      const script = await bridgeScript;
      if (!script) return sendJson(response, 500, { error: 'Bridge script missing' });
      return send(response, 200, script, 'text/javascript; charset=utf-8');
    }

    const pageMatch = pageRouteRegex.exec(pathname);
    if (method === 'GET' && pageMatch) {
      return handlePage(context, response, pageMatch[1], pageMatch[2]);
    }

    const requestMatch = requestRouteRegex.exec(pathname);
    if (method === 'GET' && requestMatch) {
      return handleGetRequest(context, response, requestMatch[1]);
    }

    const resultMatch = resultRouteRegex.exec(pathname);
    if (method === 'POST' && resultMatch) {
      return handlePostResult(context, request, response, resultMatch[1], allowedOrigins);
    }

    sendJson(response, 404, { error: 'Not found' });
  }

  return createServer((request, response) => {
    handle(request, response).catch(() => {
      if (!response.headersSent) sendJson(response, 500, { error: 'Internal error' });
    });
  });
}

export function listenApprovalServer(server: Server, port: number) {
  return new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, APPROVAL_HOST, () => {
      server.off('error', reject);
      resolve();
    });
  });
}
