import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';

import {
  LISTEN_HOST,
  MAX_REQUEST_BODY_BYTES,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
} from '../constants';
import { bridgeClientPath, renderBridgePage } from '../pages/render-page';
import { applyRequestResult, requestResultBodySchema } from '../requests/apply-request-result';
import { getRequestTitle } from '../requests/describe-request';
import { isTerminalStatus } from '../requests/pending-request-store';
import { type ServerContext } from '../server-context';

const uuidPattern = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const pagePathPattern = new RegExp(`^/(connect|approve)/${uuidPattern}$`);
const apiRequestPathPattern = new RegExp(`^/api/requests/(${uuidPattern})$`);
const apiResultPathPattern = new RegExp(`^/api/requests/(${uuidPattern})/result$`);

const securityHeaders = {
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
};

interface HttpServerOptions {
  context: ServerContext;
  port: number;
  bridgeClientSource: string | null;
}

function send(res: ServerResponse, status: number, contentType: string, body: string) {
  res.writeHead(status, { ...securityHeaders, 'content-type': contentType });
  res.end(body);
}

function sendJson(res: ServerResponse, status: number, body: Record<string, unknown>) {
  send(res, status, 'application/json; charset=utf-8', JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.length;
    if (size > MAX_REQUEST_BODY_BYTES) return undefined;
    chunks.push(buffer);
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
    return parsed;
  } catch {
    return undefined;
  }
}

function getAllowedOrigins(port: number) {
  return [`http://${LISTEN_HOST}:${port}`, `http://localhost:${port}`];
}

function isAllowedHost(req: IncomingMessage, port: number) {
  const host = req.headers.host;
  if (!host) return false;
  return getAllowedOrigins(port).includes(`http://${host}`);
}

function isAllowedOrigin(req: IncomingMessage, port: number) {
  const origin = req.headers.origin;
  if (!origin) return true;
  return getAllowedOrigins(port).includes(origin);
}

function handleGetRequest(context: ServerContext, res: ServerResponse, requestId: string) {
  const request = context.requests.get(requestId);
  if (!request) return sendJson(res, 404, { error: 'Request not found' });
  if (isTerminalStatus(request.status)) {
    return sendJson(res, 410, { error: 'Request has ended', status: request.status });
  }
  context.requests.markOpened(requestId);
  return sendJson(res, 200, {
    id: request.id,
    title: getRequestTitle(request.kind),
    summary: request.summary,
    pairingCode: request.pairingCode,
    rpcMethod: request.rpcMethod,
    rpcParams: request.rpcParams,
  });
}

async function handlePostResult(
  context: ServerContext,
  req: IncomingMessage,
  res: ServerResponse,
  requestId: string
) {
  if (!req.headers['content-type']?.startsWith('application/json')) {
    return sendJson(res, 415, { error: 'Expected application/json' });
  }
  const request = context.requests.get(requestId);
  if (!request) return sendJson(res, 404, { error: 'Request not found' });
  if (isTerminalStatus(request.status)) {
    return sendJson(res, 410, { error: 'Request has ended', status: request.status });
  }
  const body = requestResultBodySchema.safeParse(await readJsonBody(req));
  if (!body.success) return sendJson(res, 400, { error: 'Invalid result body' });

  const updated = await applyRequestResult({
    requests: context.requests,
    pairing: context.pairing,
    request,
    body: body.data,
  });
  if (!updated) return sendJson(res, 410, { error: 'Request has ended' });
  return sendJson(res, 200, { status: updated.status });
}

async function handle(options: HttpServerOptions, req: IncomingMessage, res: ServerResponse) {
  const { context, port, bridgeClientSource } = options;
  if (!isAllowedHost(req, port) || !isAllowedOrigin(req, port)) {
    return sendJson(res, 403, { error: 'Forbidden' });
  }

  const path = new URL(req.url ?? '/', context.baseUrl).pathname;

  if (req.method === 'GET') {
    if (path === '/health') {
      return sendJson(res, 200, {
        status: 'ok',
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION,
      });
    }
    if (pagePathPattern.test(path)) {
      return send(res, 200, 'text/html; charset=utf-8', renderBridgePage());
    }
    if (path === bridgeClientPath) {
      if (!bridgeClientSource) return sendJson(res, 500, { error: 'Bridge client is not built' });
      return send(res, 200, 'text/javascript; charset=utf-8', bridgeClientSource);
    }
    const apiMatch = apiRequestPathPattern.exec(path);
    if (apiMatch) return handleGetRequest(context, res, apiMatch[1]);
  }

  if (req.method === 'POST') {
    const resultMatch = apiResultPathPattern.exec(path);
    if (resultMatch) return handlePostResult(context, req, res, resultMatch[1]);
  }

  return sendJson(res, 404, { error: 'Not found' });
}

export function createHttpServer(options: HttpServerOptions): Server {
  return createServer((req, res) => {
    handle(options, req, res).catch(() => {
      if (!res.headersSent) sendJson(res, 500, { error: 'Internal error' });
    });
  });
}

export function listen(server: Server, port: number) {
  return new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, LISTEN_HOST, () => {
      server.off('error', reject);
      resolve();
    });
  });
}
