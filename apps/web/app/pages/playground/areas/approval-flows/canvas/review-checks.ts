import { createsTransaction } from '../journeys/journey-definitions';
import type { ApprovalRequest } from '../scenarios/approval-scenario.types';

interface ReviewCheck {
  label: string;
  clear: boolean;
  note: string;
}

function limitsCheck(request: ApprovalRequest): ReviewCheck {
  if (request.limits.length > 0) {
    return { label: 'Limits', clear: true, note: `${request.limits.length} enforced on-chain` };
  }
  if (request.chain === 'bitcoin') {
    return { label: 'Limits', clear: true, note: 'Inputs and outputs are the limit' };
  }
  if (!createsTransaction(request) && request.kind !== 'transaction') {
    return { label: 'Limits', clear: true, note: 'Nothing is broadcast' };
  }
  return { label: 'Limits', clear: false, note: 'No post-conditions: nothing is enforced' };
}

function movementCheck(request: ApprovalRequest): ReviewCheck {
  if (request.kind === 'connect' || request.kind === 'message') {
    return { label: 'Amount', clear: true, note: 'Nothing moves' };
  }
  if (request.movements.length > 0) {
    return {
      label: 'Amount',
      clear: true,
      note: `${request.movements.length} estimated movements`,
    };
  }
  return { label: 'Amount', clear: false, note: 'No estimated movements to show' };
}

export function reviewChecks(request: ApprovalRequest): ReviewCheck[] {
  const signerNote = request.signer
    ? `${request.account.label}, signed with ${request.signer.label}`
    : request.account.label;
  return [
    {
      label: 'Requester',
      clear: request.requester.verified,
      note: request.requester.verified
        ? request.requester.origin
        : `${request.requester.origin} is not verified`,
    },
    { label: 'Account', clear: true, note: signerNote },
    movementCheck(request),
    {
      label: 'Fee',
      clear: Boolean(request.fee) || !createsTransaction(request),
      note: request.fee ? request.fee.label : 'No fee',
    },
    limitsCheck(request),
    {
      label: 'After signing',
      clear: true,
      note: createsTransaction(request)
        ? 'Broadcasts, then shows as pending in Activity'
        : `Returns to ${request.requester.name}; nothing is broadcast`,
    },
  ];
}
