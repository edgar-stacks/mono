import type { AssetAmount } from './approval-assets';

export const approvalSections = [
  { id: 'connect', label: 'Connect' },
  { id: 'messages', label: 'Message signing' },
  { id: 'leather', label: 'Leather sends and swaps' },
  { id: 'app-transactions', label: 'App-built transactions' },
  { id: 'vaults', label: 'Vaults' },
  { id: 'defi', label: 'Staking, lending and names' },
  { id: 'stacking', label: 'Stacking' },
  { id: 'contract-calls', label: 'Generic contract calls' },
] as const;

type ApprovalSectionId = (typeof approvalSections)[number]['id'];

export type ApprovalChain = 'bitcoin' | 'stacks';

export type ApprovalWalletKind = 'software' | 'ledger';

type ApprovalAccountKind = ApprovalWalletKind | 'vault';

export interface ApprovalRequester {
  name: string;
  origin: string;
  monogram: string;
  verified: boolean;
}

export interface ApprovalAccount {
  id: string;
  label: string;
  kind: ApprovalAccountKind;
  addresses: Partial<Record<ApprovalChain, string>>;
}

export interface ApprovalMovement {
  direction: 'out' | 'in';
  amount: AssetAmount;
  counterparty?: string;
}

export interface ApprovalFee {
  amount: AssetAmount;
  label: string;
}

export interface ApprovalLimit {
  label: string;
  detail: string;
}

export interface ApprovalNotice {
  tone: 'info' | 'warning' | 'danger';
  title: string;
  body: string;
}

export interface ApprovalDetail {
  label: string;
  value: string;
  mono?: boolean;
}

export interface ApprovalSigner {
  label: string;
  state: 'signed' | 'you' | 'waiting';
  device: ApprovalWalletKind;
}

type ApprovalRequestKind =
  | 'connect'
  | 'message'
  | 'transaction'
  | 'psbt'
  | 'vault-propose'
  | 'vault-cosign'
  | 'vault-broadcast';

export type ApprovalMessageFormat = 'plain' | 'structured' | 'bip322';

export interface ApprovalRequest {
  kind: ApprovalRequestKind;
  title: string;
  subtitle: string;
  chain: ApprovalChain;
  mode: 'sign-only' | 'broadcast';
  requester: ApprovalRequester;
  account: ApprovalAccount;
  signer?: ApprovalAccount;
  movements: ApprovalMovement[];
  limits: ApprovalLimit[];
  fee?: ApprovalFee;
  details: ApprovalDetail[];
  message?: { format: ApprovalMessageFormat; body: string };
  permissions: string[];
  notices: ApprovalNotice[];
  signers: ApprovalSigner[];
  alreadySigned: boolean;
  primaryAction: string;
}

export interface ApprovalAccounts {
  personal: ApprovalAccount;
  bitcoinVault: ApprovalAccount;
  stacksVault: ApprovalAccount;
}

export interface ApprovalOutcome {
  movements: ApprovalMovement[];
  activityTitle: string;
  activityCaption: string;
}

export interface ApprovalScenarioVariant {
  id: string;
  label: string;
  build(accounts: ApprovalAccounts): ApprovalRequest;
  outcome: ApprovalOutcome;
}

export interface ApprovalApp {
  name: string;
  origin: string;
  headline: string;
  description: string;
  actionLabel: string;
}

export interface ApprovalScenario {
  id: string;
  section: ApprovalSectionId;
  title: string;
  summary: string;
  app: ApprovalApp;
  variants: ApprovalScenarioVariant[];
}
