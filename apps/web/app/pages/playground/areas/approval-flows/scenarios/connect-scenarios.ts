import type { ApprovalRequest, SignerKind } from './approval-model';
import { accountAddress, requesters, signerFor } from './scenario-fixtures';

interface ConnectScenarioOptions {
  firstVisit: boolean;
}

export function connectRequest(
  kind: SignerKind,
  { firstVisit }: ConnectScenarioOptions
): ApprovalRequest {
  return {
    kind: 'connect',
    method: 'getAddresses',
    title: `Connect to ${requesters.bitflow.name}`,
    chain: 'stacks',
    delivery: 'share',
    requester: { ...requesters.bitflow, firstVisit },
    signer: signerFor(kind, 'stacks'),
    movements: [],
    shares: [
      { label: 'Bitcoin address', address: accountAddress(kind, 'bitcoin') },
      { label: 'Stacks address', address: accountAddress(kind, 'stacks') },
      { label: 'Public keys for both addresses' },
    ],
    notices: firstVisit
      ? [{ tone: 'info', text: 'First time this site asks to connect to Leather.' }]
      : [],
    afterApproval:
      'Bitflow can see these addresses and balances and send you requests. It cannot move funds without asking.',
  };
}
