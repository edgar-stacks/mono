import { z } from 'zod';

import { getExplorerUrl } from '../format/explorer-url';
import { type PendingRequest, type PendingRequestKind } from './pending-request-store';

const requestTitles: Record<PendingRequestKind, string> = {
  connect: 'Connect Leather to your AI agent',
  send_asset: 'Approve a send in Leather',
  call_contract: 'Approve a contract call in Leather',
  swap: 'Approve a swap in Leather',
};

const transactionResultSchema = z.object({
  txid: z.string().optional(),
  status: z.enum(['broadcast', 'proposed']).optional(),
});

export function getRequestTitle(kind: PendingRequestKind) {
  return requestTitles[kind];
}

export function getRequestUrl(baseUrl: string, request: PendingRequest) {
  const page = request.requestClass === 'connect' ? 'connect' : 'approve';
  return `${baseUrl}/${page}/${request.id}`;
}

function getTransactionDetails(request: PendingRequest) {
  const parsed = transactionResultSchema.safeParse(request.result);
  const txid = parsed.success && parsed.data.txid ? parsed.data.txid : undefined;
  if (!txid || !request.chain) return {};
  return { txid, explorerUrl: getExplorerUrl(request.chain, txid) };
}

function describeAffectedAssets(request: PendingRequest) {
  if (!request.assets?.length) return 'the assets involved';
  return `assets: ${JSON.stringify(request.assets)}`;
}

function getApprovedInstructions(request: PendingRequest, txid: string | undefined) {
  if (request.requestClass === 'connect') {
    return 'The user approved the connection and the account is paired. Confirm the paired addresses to the user, then continue with read-only tools such as get_balances.';
  }
  if (!txid) {
    return 'The user approved the request in Leather, but Leather returned no txid (for example a multisig proposal). Tell the user it was approved and that co-signers may need to act before it is broadcast.';
  }
  return `The user approved and Leather broadcast the transaction. Report the txid and explorerUrl to the user. It is not confirmed yet: follow it with get_transaction_status, and once it confirms refresh only the affected balances with get_balances using ${describeAffectedAssets(request)}.`;
}

function getInstructions(request: PendingRequest, txid: string | undefined) {
  switch (request.status) {
    case 'pending':
      return 'The user has not opened the link yet. Remind them to open url in the browser where Leather is installed, then call check_request again with waitSeconds to wait for the outcome.';
    case 'opened':
      return 'The user opened the approval page and Leather is waiting for their decision. Call check_request again with waitSeconds to wait for the outcome.';
    case 'approved':
      return getApprovedInstructions(request, txid);
    case 'rejected':
      return 'The user rejected the request in Leather. Nothing was signed or sent. Do not retry unless the user asks.';
    case 'failed':
      return 'Leather could not complete the request. Nothing was sent. Tell the user the error and ask how they want to proceed.';
    case 'expired':
      return 'The request expired before the user approved it. Nothing was signed or sent. Propose it again only if the user still wants it.';
    case 'cancelled':
      return 'The request was cancelled. Nothing was signed or sent through it.';
    default:
      return 'Unknown request state.';
  }
}

export function describeRequest(baseUrl: string, request: PendingRequest) {
  const { txid, explorerUrl } = getTransactionDetails(request);
  const isActive = request.status === 'pending' || request.status === 'opened';
  const payload = {
    requestId: request.id,
    kind: request.kind,
    status: request.status,
    url: isActive ? getRequestUrl(baseUrl, request) : undefined,
    pairingCode: isActive ? request.pairingCode : undefined,
    expiresAt: new Date(request.expiresAt).toISOString(),
    summary: request.summary,
    txid,
    explorerUrl,
    addresses: request.requestClass === 'connect' ? request.result : undefined,
    error: request.error,
  };
  return { payload, instructions: getInstructions(request, txid) };
}
