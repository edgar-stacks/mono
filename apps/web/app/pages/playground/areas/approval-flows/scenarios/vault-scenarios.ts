import { amount } from './approval-assets';
import type {
  ApprovalChain,
  ApprovalRequest,
  ApprovalVault,
  ApprovalVaultSigner,
  SignerKind,
} from './approval-model';
import { stxFee } from './leather-scenarios';
import { counterparties, requesters, signerFor } from './scenario-fixtures';

type VaultStage = ApprovalVault['stage'];

export const vaultStages: { id: VaultStage; label: string }[] = [
  { id: 'propose', label: 'Propose' },
  { id: 'co-sign', label: 'Co-sign' },
  { id: 'broadcast', label: 'Broadcast' },
];

const vaultTitles: Record<VaultStage, string> = {
  propose: 'Propose vault payment',
  'co-sign': 'Co-sign vault payment',
  broadcast: 'Broadcast vault payment',
};

function vaultSigners(stage: VaultStage): ApprovalVaultSigner[] {
  return [
    { name: 'You', isYou: true, signed: stage !== 'propose' },
    { name: 'Amber', signed: stage !== 'propose' },
    { name: 'Jane', signed: stage === 'broadcast' },
  ];
}

function afterStage(stage: VaultStage) {
  if (stage === 'propose') {
    return 'Your signature starts the proposal. Two more vault members need to sign before anyone can broadcast it.';
  }
  if (stage === 'co-sign') {
    return 'Your signature is shared with the vault. One more signature reaches the threshold of 3.';
  }
  return 'All 3 signatures are in. Leather broadcasts the payment from the vault and tracks it in Activity.';
}

export function vaultRequest(
  kind: SignerKind,
  chain: ApprovalChain,
  stage: VaultStage
): ApprovalRequest {
  const isBitcoin = chain === 'bitcoin';
  return {
    kind: 'vault',
    method: isBitcoin ? 'signPsbt' : 'stx_signTransaction',
    title: vaultTitles[stage],
    chain,
    delivery: stage === 'broadcast' ? 'broadcast' : 'sign-only',
    requester: requesters.leather,
    signer: signerFor(kind, chain),
    vault: {
      name: 'Team Treasury',
      chain,
      address: isBitcoin ? counterparties.vaultBitcoin : counterparties.vaultStacks,
      threshold: 3,
      signers: vaultSigners(stage),
      stage,
    },
    movements: [
      {
        direction: 'out',
        value: isBitcoin ? amount('BTC', 0.25) : amount('STX', 12000),
        counterparty: isBitcoin ? counterparties.friendBitcoin : counterparties.friendStacks,
      },
    ],
    fee: isBitcoin
      ? { value: amount('BTC', 0.0000412), speed: '~30 min', paidBy: 'Team Treasury' }
      : { ...stxFee(), paidBy: 'Team Treasury' },
    notices:
      stage === 'broadcast'
        ? []
        : [{ tone: 'info', text: 'Signing does not move funds. Nothing is broadcast yet.' }],
    afterApproval: afterStage(stage),
    alreadySigned: stage === 'broadcast',
  };
}
