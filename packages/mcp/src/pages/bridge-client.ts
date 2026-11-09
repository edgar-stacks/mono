import { z } from 'zod';

interface BridgeProvider {
  request(method: string, params?: unknown): Promise<unknown>;
}

declare global {
  interface Window {
    LeatherProvider?: BridgeProvider;
  }
}

const userRejectionCode = 4001;
const providerPollIntervalMs = 250;
const providerWaitMs = 10_000;

const bridgeRequestSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.array(z.string()),
  pairingCode: z.string().optional(),
  rpcMethod: z.string(),
  rpcParams: z.record(z.string(), z.unknown()),
});

type BridgeRequest = z.infer<typeof bridgeRequestSchema>;

const rpcErrorSchema = z.object({
  error: z.object({ code: z.number(), message: z.string() }),
});

const successResponseSchema = z.object({ result: z.unknown() });

function getElement(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element;
}

function setStatus(message: string) {
  getElement('status').textContent = message;
}

function renderRequest(request: BridgeRequest) {
  getElement('title').textContent = request.title;
  const summary = getElement('summary');
  summary.replaceChildren(
    ...request.summary.map(line => {
      const item = document.createElement('li');
      item.textContent = line;
      return item;
    })
  );
  if (request.pairingCode) {
    getElement('code').textContent = `Pairing code: ${request.pairingCode}`;
  }
}

async function waitForProvider() {
  const deadline = Date.now() + providerWaitMs;
  while (!window.LeatherProvider && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, providerPollIntervalMs));
  }
  return window.LeatherProvider;
}

async function postResult(requestId: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/requests/${requestId}/result`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.ok;
}

function describeError(error: unknown) {
  const rpcError = rpcErrorSchema.safeParse(error);
  if (rpcError.success) return rpcError.data.error;
  return { code: null, message: error instanceof Error ? error.message : 'Unknown error' };
}

async function runRequest(provider: BridgeProvider, request: BridgeRequest) {
  setStatus('Waiting for your approval in Leather…');
  try {
    const response = await provider.request(request.rpcMethod, request.rpcParams);
    const success = successResponseSchema.safeParse(response);
    const result = success.success ? success.data.result : response;
    const saved = await postResult(request.id, { outcome: 'approved', result });
    setStatus(
      saved
        ? 'Approved. You can close this tab and return to your agent.'
        : 'Approved in Leather, but this request had already ended.'
    );
  } catch (error) {
    const { code, message } = describeError(error);
    const outcome = code === userRejectionCode ? 'rejected' : 'failed';
    await postResult(request.id, { outcome, message });
    setStatus(
      outcome === 'rejected'
        ? 'Rejected. You can close this tab.'
        : `Leather could not complete the request: ${message}`
    );
  }
}

async function main() {
  const requestId = window.location.pathname.split('/').pop();
  if (!requestId) {
    setStatus('This link is not valid.');
    return;
  }

  const response = await fetch(`/api/requests/${requestId}`);
  if (response.status === 410) {
    setStatus('This request has already ended. Ask your agent for a new link.');
    return;
  }
  if (!response.ok) {
    setStatus('This request was not found. Ask your agent for a new link.');
    return;
  }

  const parsed = bridgeRequestSchema.safeParse(await response.json());
  if (!parsed.success) {
    setStatus('This request could not be read.');
    return;
  }
  const request = parsed.data;
  renderRequest(request);

  const provider = await waitForProvider();
  if (!provider) {
    setStatus('Leather was not found in this browser. Install or unlock Leather, then reload.');
    return;
  }

  const button = getElement('approve');
  button.hidden = false;
  setStatus('Review the details, then open Leather to approve or reject.');
  button.addEventListener(
    'click',
    () => {
      button.hidden = true;
      void runRequest(provider, request);
    },
    { once: true }
  );
}

void main();
