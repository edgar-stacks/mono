import { z } from 'zod';

import { MAX_WAIT_SECONDS } from '../constants';
import type { PendingRequest } from '../requests/pending-request-store';
import { getExplorerUrl } from './explorer-links';

const transactionResultSchema = z.object({
  txid: z.string().optional(),
  proposalId: z.string().optional(),
  status: z.enum(['broadcast', 'proposed']).optional(),
});

function getRequestUrl(baseUrl: string, request: PendingRequest) {
  const page = request.kind === 'connect' ? 'connect' : 'approve';
  return `${baseUrl}/${page}/${encodeURIComponent(request.id)}`;
}

function readTransactionOutcome(request: PendingRequest) {
  const parsed = transactionResultSchema.safeParse(request.result);
  if (!parsed.success) return {};
  const { txid, proposalId, status } = parsed.data;
  return {
    ...(txid ? { txid } : {}),
    ...(txid && request.chain ? { explorerUrl: getExplorerUrl(request.chain, txid) } : {}),
    ...(proposalId ? { proposalId } : {}),
    ...(status ? { broadcastStatus: status } : {}),
  };
}

export function describeRequest(baseUrl: string, request: PendingRequest) {
  return {
    requestId: request.id,
    kind: request.kind,
    state: request.state,
    title: request.title,
    summary: request.summary,
    ...(request.pairingCode ? { pairingCode: request.pairingCode } : {}),
    ...(request.kind === 'connect'
      ? { connectUrl: getRequestUrl(baseUrl, request) }
      : { approvalUrl: getRequestUrl(baseUrl, request) }),
    expiresAt: new Date(request.expiresAt).toISOString(),
    ...(request.state === 'approved' && request.kind !== 'connect'
      ? readTransactionOutcome(request)
      : {}),
    ...(request.error ? { error: request.error } : {}),
  };
}

function getApprovedInstructions(request: PendingRequest) {
  if (request.kind === 'connect') {
    return 'The wallet is paired. Call get_wallet_status to show the user the paired addresses, then continue with their task.';
  }
  const outcome = readTransactionOutcome(request);
  const affected = request.affectedAssets?.length
    ? ` Then call get_balances with assets ${JSON.stringify(request.affectedAssets)} to refresh only the affected balances.`
    : '';
  if (outcome.broadcastStatus === 'proposed') {
    return `The user approved it and Leather proposed it to the multisig co-signers (proposalId ${outcome.proposalId ?? 'unknown'}). Tell the user it broadcasts once the other signers approve.`;
  }
  return `The user approved it and Leather broadcast it. Report the txid and explorerUrl to the user. It may take a while to confirm; use get_transaction_status to follow it, not repeated check_request calls.${affected}`;
}

export function getRequestInstructions(request: PendingRequest) {
  switch (request.state) {
    case 'pending':
      return `Waiting for the user to open the link (connectUrl or approvalUrl). Make sure they have it, then call check_request with waitSeconds up to ${MAX_WAIT_SECONDS} to wait for the outcome.`;
    case 'opened':
      return `The user opened the page and is reviewing the request in Leather. Call check_request with waitSeconds up to ${MAX_WAIT_SECONDS} to wait for the outcome.`;
    case 'approved':
      return getApprovedInstructions(request);
    case 'rejected':
      return 'The user rejected this request in Leather. Nothing moved. Do not resubmit unless the user asks.';
    case 'failed':
      return 'Leather could not complete this request; nothing was approved. Tell the user the error and ask how to proceed.';
    case 'expired':
      return 'This request expired before it was approved; nothing moved. Create a new one only if the user still wants it.';
    case 'cancelled':
      return 'This request was cancelled; nothing moved.';
    default:
      return 'Unknown request state.';
  }
}
