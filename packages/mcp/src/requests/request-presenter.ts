import { z } from 'zod';

import { HIRO_EXPLORER_URL, MEMPOOL_BASE_URL } from '@leather.io/constants';

import {
  type PendingRequest,
  type RequestChain,
  type RequestState,
  acceptsLateApproval,
} from './request.types';

const transactionResultSchema = z.object({
  txid: z.string().optional(),
  proposalId: z.string().optional(),
  status: z.enum(['broadcast', 'proposed']).optional(),
});

function getRequestUrl(request: PendingRequest, baseUrl: string) {
  const path = request.requestClass === 'connect' ? 'connect' : 'approve';
  return `${baseUrl}/${path}/${request.id}`;
}

export function getExplorerUrl(chain: RequestChain, txid: string) {
  if (chain === 'bitcoin') return `${MEMPOOL_BASE_URL}/tx/${txid}`;
  return `${HIRO_EXPLORER_URL}/txid/${txid}?chain=mainnet`;
}

function readTransactionOutcome(request: PendingRequest) {
  if (request.requestClass !== 'transaction' || request.state !== 'approved') return {};
  const parsed = transactionResultSchema.safeParse(request.result);
  if (!parsed.success) return {};
  const { txid, proposalId, status } = parsed.data;
  return {
    txid,
    proposalId,
    broadcastStatus: status,
    explorerUrl: txid && request.chain ? getExplorerUrl(request.chain, txid) : undefined,
  };
}

const pendingInstructions: Record<PendingRequest['requestClass'], string> = {
  connect:
    'Ask the user to open connectUrl in the desktop browser where the Leather extension is installed, check that the page shows pairingCode, and approve the connection in Leather. Then call check_request with waitSeconds to wait for the answer.',
  transaction:
    'Nothing has moved yet. Ask the user to open approvalUrl in the desktop browser where the Leather extension is installed and review and approve the transaction in Leather. Then call check_request with waitSeconds to wait for the answer. Do not propose the same transaction again while this one is open.',
};

function getApprovedInstructions(request: PendingRequest, hasTxid: boolean) {
  if (request.requestClass === 'connect') {
    return 'The wallet is paired. Call get_wallet_status to see the paired addresses before reading balances or proposing transactions.';
  }
  if (hasTxid) {
    return 'The user approved and Leather broadcast the transaction. Report the txid and explorerUrl to the user. Follow confirmation with get_transaction_status, and once it confirms refresh only the affected balances with get_balances and its assets filter.';
  }
  return 'The user approved the request in Leather. Report the outcome to the user; if a proposalId is present the transaction waits for co-signers and has not been broadcast yet.';
}

const openedThenClosedInstructions =
  'The user had already opened this request, so Leather may still be showing it and the user can still approve it there, in which case Leather broadcasts it. Do not propose the same transaction again: ask the user whether they approved it in Leather and call check_request, which reports approved with the txid if they did.';

function getInstructions(request: PendingRequest, hasTxid: boolean) {
  if (acceptsLateApproval(request)) {
    const closedReason =
      request.state === 'expired' ? 'The request expired.' : 'The request was cancelled.';
    return `${closedReason} ${openedThenClosedInstructions}`;
  }
  const instructionsByState: Record<RequestState, string> = {
    pending: pendingInstructions[request.requestClass],
    opened: `The user opened the approval page. ${pendingInstructions[request.requestClass]}`,
    approved: getApprovedInstructions(request, hasTxid),
    rejected:
      'The user rejected the request in Leather. Nothing was signed. Do not retry unless the user asks for it.',
    failed:
      'The request failed and nothing was broadcast. Report error.message to the user and ask how to proceed.',
    expired:
      'The request expired without an answer and nothing was signed. Propose it again only if the user still wants it.',
    cancelled: 'The request was cancelled and nothing was signed.',
  };
  return instructionsByState[request.state];
}

export function presentRequest(request: PendingRequest, baseUrl: string) {
  const transactionOutcome = readTransactionOutcome(request);
  return {
    data: {
      requestId: request.id,
      type: request.requestClass,
      state: request.state,
      summary: request.summary,
      [request.requestClass === 'connect' ? 'connectUrl' : 'approvalUrl']: getRequestUrl(
        request,
        baseUrl
      ),
      pairingCode: request.pairingCode,
      expiresAt: new Date(request.expiresAt).toISOString(),
      error: request.error,
      ...transactionOutcome,
    },
    instructions: getInstructions(request, !!transactionOutcome.txid),
  };
}
