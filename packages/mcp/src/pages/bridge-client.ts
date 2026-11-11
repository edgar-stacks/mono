import { z } from 'zod';

interface LeatherProviderLike {
  request(method: string, params?: unknown): Promise<unknown>;
}

const userRejectionErrorCode = 4001;
const providerWaitMs = 3000;
const providerPollMs = 100;

const leatherProviderSchema = z.custom<LeatherProviderLike>(
  value =>
    typeof value === 'object' &&
    value !== null &&
    'request' in value &&
    typeof value.request === 'function'
);

const requestPayloadSchema = z.object({
  rpcMethod: z.string(),
  rpcParams: z.record(z.string(), z.unknown()),
});

const terminalPayloadSchema = z.object({ state: z.string() });

const rpcSuccessSchema = z.object({ result: z.unknown() });

const rpcErrorSchema = z.object({
  error: z.object({ code: z.number().optional(), message: z.string().optional() }),
});

type BridgeStatus = 'info' | 'success' | 'error';

function getElement(id: string) {
  return document.getElementById(id);
}

function setStatus(message: string, status: BridgeStatus = 'info') {
  const element = getElement('status');
  if (!element) return;
  element.textContent = message;
  element.dataset.status = status;
}

function setButtonEnabled(enabled: boolean) {
  const button = getElement('approve');
  if (button instanceof HTMLButtonElement) button.disabled = !enabled;
}

function readRequestId() {
  const script = document.currentScript;
  if (!(script instanceof HTMLScriptElement)) return undefined;
  return script.dataset.requestId;
}

function readProvider() {
  const parsed = leatherProviderSchema.safeParse(Reflect.get(window, 'LeatherProvider'));
  return parsed.success ? parsed.data : undefined;
}

async function waitForProvider() {
  const deadline = Date.now() + providerWaitMs;
  while (Date.now() < deadline) {
    const provider = readProvider();
    if (provider) return provider;
    await new Promise(resolve => setTimeout(resolve, providerPollMs));
  }
  return readProvider();
}

async function postResult(requestId: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/requests/${encodeURIComponent(requestId)}/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.ok;
}

function readRpcError(error: unknown) {
  const parsed = rpcErrorSchema.safeParse(error);
  if (parsed.success) {
    return {
      code: parsed.data.error.code,
      message: parsed.data.error.message ?? 'Leather returned an error',
    };
  }
  return { message: error instanceof Error ? error.message : 'Leather returned an error' };
}

async function submitToLeather(
  requestId: string,
  provider: LeatherProviderLike,
  rpcMethod: string,
  rpcParams: Record<string, unknown>
) {
  setButtonEnabled(false);
  setStatus('Waiting for you to review the request in Leather…');
  try {
    const response = await provider.request(rpcMethod, rpcParams);
    const parsed = rpcSuccessSchema.safeParse(response);
    const posted = await postResult(requestId, {
      status: 'approved',
      result: parsed.success ? parsed.data.result : response,
    });
    setStatus(
      posted
        ? 'Approved. You can close this tab and return to your agent.'
        : 'Approved in Leather, but this request is no longer active.',
      posted ? 'success' : 'error'
    );
  } catch (error) {
    const rpcError = readRpcError(error);
    const status = rpcError.code === userRejectionErrorCode ? 'rejected' : 'failed';
    await postResult(requestId, { status, error: rpcError });
    setStatus(
      status === 'rejected'
        ? 'Request rejected. You can close this tab.'
        : `Leather could not complete the request: ${rpcError.message}`,
      'error'
    );
  }
}

async function run() {
  const requestId = readRequestId();
  if (!requestId) {
    setStatus('This page is missing its request id.', 'error');
    return;
  }

  const response = await fetch(`/api/requests/${encodeURIComponent(requestId)}`, {
    headers: { Accept: 'application/json' },
  });
  if (response.status === 410) {
    const payload = terminalPayloadSchema.safeParse(await response.json());
    setStatus(
      `This request is no longer active${payload.success ? ` (${payload.data.state})` : ''}.`,
      'error'
    );
    return;
  }
  if (!response.ok) {
    setStatus('This request was not found. Ask your agent for a new link.', 'error');
    return;
  }

  const payload = requestPayloadSchema.safeParse(await response.json());
  if (!payload.success) {
    setStatus('This request could not be read.', 'error');
    return;
  }

  const provider = await waitForProvider();
  if (!provider) {
    setStatus(
      'Leather was not found in this browser. Install or unlock the Leather extension, then reload this page.',
      'error'
    );
    return;
  }

  const { rpcMethod, rpcParams } = payload.data;
  const button = getElement('approve');
  if (!(button instanceof HTMLButtonElement)) {
    await submitToLeather(requestId, provider, rpcMethod, rpcParams);
    return;
  }
  setStatus('Ready. Select the button to review this request in Leather.');
  setButtonEnabled(true);
  button.addEventListener(
    'click',
    () => void submitToLeather(requestId, provider, rpcMethod, rpcParams),
    { once: true }
  );
}

void run();
