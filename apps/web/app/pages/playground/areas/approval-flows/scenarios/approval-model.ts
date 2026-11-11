import type { AssetAmount } from './approval-assets';

export type ApprovalChain = 'bitcoin' | 'stacks';

type ApprovalKind = 'connect' | 'message' | 'transaction' | 'psbt' | 'vault';

export type ApprovalDelivery = 'share' | 'sign-only' | 'broadcast';

export type SignerKind = 'software' | 'ledger';

export interface ApprovalRequester {
  name: string;
  origin: string;
  monogram: string;
  tint: string;
  firstVisit?: boolean;
}

export interface ApprovalSigner {
  kind: SignerKind;
  accountName: string;
  address: string;
  chain: ApprovalChain;
}

export interface ApprovalVaultSigner {
  name: string;
  isYou?: boolean;
  signed: boolean;
}

export interface ApprovalVault {
  name: string;
  chain: ApprovalChain;
  address: string;
  threshold: number;
  signers: ApprovalVaultSigner[];
  stage: 'propose' | 'co-sign' | 'broadcast';
}

export interface ApprovalMovement {
  direction: 'out' | 'in';
  value: AssetAmount;
  counterparty?: string;
  estimated?: boolean;
}

export interface ApprovalFee {
  value: AssetAmount;
  speed?: string;
  paidBy?: string;
}

export interface ApprovalLimits {
  mode: 'deny' | 'allow' | 'none';
  rules: string[];
}

export type MessageFormat = 'utf8' | 'structured' | 'bip322';

export interface ApprovalMessage {
  format: MessageFormat;
  content: string;
  domain?: string;
}

export interface ApprovalContractCall {
  contractId: string;
  functionName: string;
  args: { name: string; value: string }[];
}

export interface ApprovalShare {
  label: string;
  address?: string;
}

export interface ApprovalNotice {
  tone: 'info' | 'warning' | 'danger';
  text: string;
}

export interface ApprovalRequest {
  kind: ApprovalKind;
  method: string;
  title: string;
  chain: ApprovalChain;
  delivery: ApprovalDelivery;
  requester: ApprovalRequester;
  signer: ApprovalSigner;
  vault?: ApprovalVault;
  movements: ApprovalMovement[];
  fee?: ApprovalFee;
  limits?: ApprovalLimits;
  message?: ApprovalMessage;
  contractCall?: ApprovalContractCall;
  shares?: ApprovalShare[];
  notices: ApprovalNotice[];
  afterApproval: string;
  alreadySigned?: boolean;
  queueLength?: number;
}

export function approveLabel(request: ApprovalRequest) {
  if (request.kind === 'connect') return 'Connect';
  if (request.vault?.stage === 'propose') return 'Propose';
  if (request.vault?.stage === 'broadcast' || request.alreadySigned) return 'Broadcast';
  if (request.delivery === 'sign-only') return 'Sign';
  return 'Approve';
}

export function needsDeviceSignature(request: ApprovalRequest) {
  if (request.signer.kind !== 'ledger') return false;
  if (request.kind === 'connect') return false;
  return !request.alreadySigned;
}

export function createsTransaction(request: ApprovalRequest) {
  if (request.kind === 'connect' || request.kind === 'message') return false;
  if (request.vault && request.vault.stage !== 'broadcast') return false;
  return request.delivery === 'broadcast';
}
