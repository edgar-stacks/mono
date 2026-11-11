import { type DemoAssetSymbol, amount, demoAssets } from './approval-assets';
import type { ApprovalRequest, SignerKind } from './approval-model';
import { counterparties, requesters, signerFor } from './scenario-fixtures';

export type SendAssetSymbol = Extract<DemoAssetSymbol, 'BTC' | 'STX' | 'sBTC'>;

const sendAmounts: Record<SendAssetSymbol, number> = { BTC: 0.0125, STX: 420, sBTC: 0.005 };

export function leatherSendRequest(kind: SignerKind, symbol: SendAssetSymbol): ApprovalRequest {
  const chain = demoAssets[symbol].chain;
  const recipient =
    chain === 'bitcoin' ? counterparties.friendBitcoin : counterparties.friendStacks;
  return {
    kind: 'transaction',
    method: chain === 'bitcoin' ? 'sendTransfer' : 'stx_transferStx',
    title: `Send ${symbol}`,
    chain,
    delivery: 'broadcast',
    requester: requesters.leather,
    signer: signerFor(kind, chain),
    movements: [
      { direction: 'out', value: amount(symbol, sendAmounts[symbol]), counterparty: recipient },
    ],
    fee: chain === 'bitcoin' ? { value: amount('BTC', 0.0000282), speed: '~30 min' } : stxFee(),
    limits:
      symbol === 'sBTC'
        ? { mode: 'deny', rules: [`You send exactly ${sendAmounts.sBTC} sBTC`] }
        : undefined,
    notices: [],
    afterApproval: `Leather broadcasts the transfer. ${symbol} leaves your balance once it confirms.`,
  };
}

export function leatherSwapRequest(kind: SignerKind): ApprovalRequest {
  return {
    kind: 'transaction',
    method: 'stx_callContract',
    title: 'Swap STX for sBTC',
    chain: 'stacks',
    delivery: 'broadcast',
    requester: requesters.leather,
    signer: signerFor(kind, 'stacks'),
    movements: [
      { direction: 'out', value: amount('STX', 1500) },
      { direction: 'in', value: amount('sBTC', 0.00961), estimated: true },
    ],
    fee: stxFee(),
    limits: {
      mode: 'deny',
      rules: ['You send exactly 1,500 STX', 'You receive at least 0.00951 sBTC'],
    },
    notices: [{ tone: 'info', text: 'Quote from Bitflow, refreshed 12 seconds ago. Slippage 1%.' }],
    afterApproval:
      'The swap settles in one Stacks transaction. If the price moves past 1%, it fails and only the fee is spent.',
  };
}

export function stxFee() {
  return { value: amount('STX', 0.0045), speed: 'Standard' };
}
