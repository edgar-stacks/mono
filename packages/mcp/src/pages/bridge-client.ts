interface BridgeLeatherProvider {
  request(method: string, params?: unknown): Promise<unknown>;
}

declare global {
  interface Window {
    LeatherProvider?: BridgeLeatherProvider;
  }
}

const providerPollIntervalMs = 100;
const providerPollMaxMs = 3000;
const userRejectionErrorCode = 4001;

interface BridgeRequest {
  rpcMethod: string;
  rpcParams: unknown;
}

function getElement(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element;
}

function setStatus(message: string) {
  getElement('status').textContent = message;
}

function setButtonEnabled(enabled: boolean) {
  const button = getElement('approve');
  if (button instanceof HTMLButtonElement) button.disabled = !enabled;
}

function readBridgeRequest(value: unknown): BridgeRequest | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  if (!('rpcMethod' in value) || typeof value.rpcMethod !== 'string') return undefined;
  return { rpcMethod: value.rpcMethod, rpcParams: 'rpcParams' in value ? value.rpcParams : {} };
}

function readRpcError(error: unknown) {
  const body =
    typeof error === 'object' && error !== null && 'error' in error ? error.error : error;
  if (typeof body === 'object' && body !== null) {
    const code = 'code' in body && typeof body.code === 'number' ? body.code : undefined;
    const message =
      'message' in body && typeof body.message === 'string' ? body.message : 'Request failed';
    return { code, message };
  }
  if (error instanceof Error) return { code: undefined, message: error.message };
  return { code: undefined, message: 'Request failed' };
}

function readRpcResult(response: unknown) {
  if (typeof response === 'object' && response !== null && 'result' in response) {
    return response.result;
  }
  return response;
}

async function waitForProvider() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < providerPollMaxMs) {
    if (window.LeatherProvider) return window.LeatherProvider;
    await new Promise(resolve => setTimeout(resolve, providerPollIntervalMs));
  }
  return window.LeatherProvider;
}

async function postOutcome(requestId: string, outcome: Record<string, unknown>) {
  const response = await fetch(`/api/requests/${requestId}/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(outcome),
  });
  return response.ok;
}

async function runRequest(
  requestId: string,
  provider: BridgeLeatherProvider,
  request: BridgeRequest
) {
  setButtonEnabled(false);
  setStatus('Waiting for your answer in Leather…');
  try {
    const response = await provider.request(request.rpcMethod, request.rpcParams);
    await postOutcome(requestId, { status: 'approved', result: readRpcResult(response) });
    setStatus('Approved. You can close this tab and return to your agent.');
  } catch (error) {
    const rpcError = readRpcError(error);
    const status = rpcError.code === userRejectionErrorCode ? 'rejected' : 'failed';
    await postOutcome(requestId, { status, error: rpcError });
    setStatus(
      status === 'rejected'
        ? 'You rejected the request. You can close this tab.'
        : `Leather could not complete the request: ${rpcError.message}`
    );
  }
}

async function main() {
  const requestId = document.currentScript?.dataset.requestId;
  if (!requestId) return setStatus('This page is missing its request id.');

  const response = await fetch(`/api/requests/${requestId}`);
  if (response.status === 410) {
    return setStatus('This request is no longer open. Ask your agent for a new link.');
  }
  if (!response.ok) return setStatus('This request was not found. Ask your agent for a new link.');

  const request = readBridgeRequest(await response.json());
  if (!request) return setStatus('This request could not be read.');

  const provider = await waitForProvider();
  if (!provider) {
    return setStatus(
      'Leather was not detected. Open this link in the desktop browser where the Leather extension is installed and unlocked.'
    );
  }

  setStatus('Ready. Select Review in Leather to continue.');
  setButtonEnabled(true);
  getElement('approve').addEventListener('click', () => {
    void runRequest(requestId, provider, request);
  });
}

void main();

export {};
