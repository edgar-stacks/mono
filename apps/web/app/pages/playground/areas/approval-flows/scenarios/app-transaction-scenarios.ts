import { amount } from './approval-assets';
import type { ApprovalDelivery, ApprovalRequest, SignerKind } from './approval-model';
import { stxFee } from './leather-scenarios';
import { counterparties, requesters, signerFor } from './scenario-fixtures';

type TransactionDelivery = Extract<ApprovalDelivery, 'sign-only' | 'broadcast'>;

export const deliveryOptions: { id: TransactionDelivery; label: string }[] = [
  { id: 'broadcast', label: 'Sign and broadcast' },
  { id: 'sign-only', label: 'Sign only' },
];

function afterDelivery(delivery: TransactionDelivery, appName: string) {
  if (delivery === 'sign-only') {
    return `${appName} receives the signed transaction and decides when to broadcast it. Leather records nothing in Activity.`;
  }
  return 'Leather broadcasts the transaction and tracks it in Activity until it confirms.';
}

export function appBitcoinTransactionRequest(
  kind: SignerKind,
  delivery: TransactionDelivery
): ApprovalRequest {
  return {
    kind: 'transaction',
    method: 'sendTransfer',
    title: 'Send bitcoin',
    chain: 'bitcoin',
    delivery,
    requester: requesters.magicEden,
    signer: signerFor(kind, 'bitcoin'),
    movements: [
      {
        direction: 'out',
        value: amount('BTC', 0.0042),
        counterparty: counterparties.friendBitcoin,
      },
    ],
    fee: { value: amount('BTC', 0.0000196), speed: '~30 min' },
    notices: [],
    afterApproval: afterDelivery(delivery, requesters.magicEden.name),
  };
}

export function appStacksTransactionRequest(
  kind: SignerKind,
  delivery: TransactionDelivery
): ApprovalRequest {
  return {
    kind: 'transaction',
    method: 'stx_transferStx',
    title: 'Send STX',
    chain: 'stacks',
    delivery,
    requester: requesters.gamma,
    signer: signerFor(kind, 'stacks'),
    movements: [
      { direction: 'out', value: amount('STX', 75), counterparty: counterparties.friendStacks },
    ],
    fee: stxFee(),
    notices: [],
    afterApproval: afterDelivery(delivery, requesters.gamma.name),
  };
}

export function psbtRequest(kind: SignerKind, delivery: TransactionDelivery): ApprovalRequest {
  return {
    kind: 'psbt',
    method: 'signPsbt',
    title: 'Sign transaction',
    chain: 'bitcoin',
    delivery,
    requester: requesters.magicEden,
    signer: signerFor(kind, 'bitcoin'),
    movements: [
      { direction: 'out', value: amount('BTC', 0.0031), counterparty: 'Magic Eden listing' },
      { direction: 'in', value: amount('BTC', 0.00002), estimated: true },
    ],
    fee: { value: amount('BTC', 0.0000141), speed: 'Set by Magic Eden', paidBy: 'You' },
    notices: [
      { tone: 'info', text: 'You sign 2 of 3 inputs. The other input belongs to the seller.' },
    ],
    afterApproval: afterDelivery(delivery, requesters.magicEden.name),
  };
}
