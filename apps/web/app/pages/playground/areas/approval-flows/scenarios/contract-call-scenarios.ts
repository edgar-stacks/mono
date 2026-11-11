import { amount } from './approval-assets';
import type { ApprovalRequest, SignerKind } from './approval-model';
import { stxFee } from './leather-scenarios';
import { requesters, signerFor } from './scenario-fixtures';

export function contractMintRequest(kind: SignerKind): ApprovalRequest {
  return {
    kind: 'transaction',
    method: 'stx_callContract',
    title: 'Call claim',
    chain: 'stacks',
    delivery: 'broadcast',
    requester: requesters.gamma,
    signer: signerFor(kind, 'stacks'),
    contractCall: {
      contractId: 'SP3QSAJQ4EA8WXEDSRRKMZZ29NH91VZ6C5X88FGZQ.stacks-punks-mint',
      functionName: 'claim',
      args: [{ name: 'count', value: 'u1' }],
    },
    movements: [{ direction: 'out', value: amount('STX', 25) }],
    fee: stxFee(),
    limits: {
      mode: 'deny',
      rules: ['You send exactly 25 STX', 'You receive 1 stacks-punk'],
    },
    notices: [],
    afterApproval: 'The contract mints one collectible to your account once the call confirms.',
  };
}

export function contractVoteRequest(kind: SignerKind): ApprovalRequest {
  return {
    kind: 'transaction',
    method: 'stx_callContract',
    title: 'Call vote',
    chain: 'stacks',
    delivery: 'broadcast',
    requester: requesters.dao,
    signer: signerFor(kind, 'stacks'),
    contractCall: {
      contractId: 'SP3JP0N1ZXGASRJ0F7QAHWFPGTVK9T2XNXDB908Z.dao-proposal-voting',
      functionName: 'vote',
      args: [
        { name: 'proposal', value: "'SP3JP…908Z.sip-031-emissions" },
        { name: 'for', value: 'true' },
      ],
    },
    movements: [],
    fee: stxFee(),
    limits: { mode: 'deny', rules: ['No tokens leave your account'] },
    notices: [],
    afterApproval: 'Your vote counts with the weight of your STX balance at the snapshot block.',
  };
}

export function contractUnlimitedRequest(kind: SignerKind): ApprovalRequest {
  return {
    kind: 'transaction',
    method: 'stx_callContract',
    title: 'Call execute-route',
    chain: 'stacks',
    delivery: 'broadcast',
    requester: requesters.alex,
    signer: signerFor(kind, 'stacks'),
    contractCall: {
      contractId: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.amm-router-v3',
      functionName: 'execute-route',
      args: [
        { name: 'route', value: '(list STX ALEX aeUSDC)' },
        { name: 'dx', value: 'u250000000' },
      ],
    },
    movements: [],
    fee: stxFee(),
    limits: { mode: 'allow', rules: [] },
    notices: [
      {
        tone: 'danger',
        text: 'This call sets no spending limits. It can move any tokens the contract can reach, and Leather cannot estimate what will change.',
      },
    ],
    afterApproval:
      'Whatever the contract does runs once the call confirms. Check Activity for the balance changes.',
  };
}
