const complianceInbox = 'compliance@leather.io';

export const complianceScreeningDurationMs = 1600;

export const complianceCopy = {
  lockout: {
    title: 'Leather is locked',
    body: 'An address in one of your wallets is restricted, so Leather can’t show balances or make transactions.',
    why: 'Why am I seeing this?',
    dispute: 'Dispute this',
  },
  why: {
    title: 'Why Leather is locked',
    body: 'Leather checks wallet addresses against sanctions and risk data. One of yours matched, so we can’t provide service in this app.',
    funds: 'Your funds stay on the blockchain and remain under your control.',
    backupLink(walletName: string) {
      return `Back up ${walletName} Secret Key`;
    },
    backupNote: 'Shown only for wallets created in Leather',
  },
  recipientRefused: {
    title: 'Leather can’t send this',
    body: 'This recipient is restricted, so nothing was sent. Your wallet isn’t affected.',
  },
  counterpartyRefused: {
    title: 'Leather can’t sign this',
    body: 'Another party is restricted, so nothing was signed. Your wallet isn’t affected.',
  },
  multisigRefused: {
    title: 'Leather can’t propose this',
    body: 'A member is restricted, so nothing was proposed. Your other accounts aren’t affected.',
  },
  actions: {
    close: 'Close',
    cancel: 'Cancel',
    tryAgain: 'Try again',
  },
  noAnswer: {
    title: 'Can’t complete this right now',
    body: 'Nothing was signed. Please try again in a moment.',
    supportPrefix: 'If this keeps happening, ',
    supportLink: 'contact support',
    supportSuffix: '.',
  },
  keyBackup: {
    title: 'Back up your Secret Key',
    prompt(walletName: string) {
      return `Enter your password to view ${walletName}’s Secret Key.`;
    },
    keyTitle(walletName: string) {
      return `${walletName} Secret Key`;
    },
    warning: 'Never share it. Anyone with these words controls the funds.',
    reveal: 'Click to reveal',
    confirm: 'I’ve backed it up',
  },
  mail: {
    disputeSubject: 'Dispute: Leather account restricted',
    supportSubject: 'Transaction couldn’t be completed',
    filledInHeading: '— Filled in by Leather —',
  },
};

export const complianceCopyGroups = [
  { id: 'lockout', label: 'Lockout' },
  { id: 'why', label: 'Why Leather is locked' },
  { id: 'recipientRefused', label: 'Refusal: recipient' },
  { id: 'counterpartyRefused', label: 'Refusal: counterparty' },
  { id: 'multisigRefused', label: 'Refusal: multisig member' },
  { id: 'actions', label: 'Actions' },
  { id: 'noAnswer', label: 'No answer' },
  { id: 'keyBackup', label: 'Key backup' },
  { id: 'mail', label: 'Emails' },
] as const satisfies readonly { id: keyof typeof complianceCopy; label: string }[];

export type CompliancePlatform = 'extension' | 'mobile';

type ComplianceWalletOrigin = 'created' | 'imported' | 'ledger';

export interface ComplianceWallet {
  id: string;
  name: string;
  origin: ComplianceWalletOrigin;
}

export function getBackupWallets(wallets: readonly ComplianceWallet[]) {
  return wallets.filter(wallet => wallet.origin === 'created');
}

export const complianceWalletSets = {
  created: [{ id: 'wallet-1', name: 'Wallet 1', origin: 'created' }],
  imported: [{ id: 'wallet-1', name: 'Wallet 1', origin: 'imported' }],
  several: [
    { id: 'wallet-1', name: 'Wallet 1', origin: 'created' },
    { id: 'wallet-2', name: 'Wallet 2', origin: 'imported' },
    { id: 'wallet-3', name: 'Wallet 3', origin: 'created' },
    { id: 'ledger', name: 'Ledger', origin: 'ledger' },
  ],
} satisfies Record<string, ComplianceWallet[]>;

export const mockSecretKey = [
  'orbit',
  'lamp',
  'velvet',
  'pioneer',
  'harbor',
  'mango',
  'cradle',
  'fossil',
  'tribe',
  'embark',
  'glide',
  'quantum',
];

export const mockAccount = {
  name: 'Account 1',
  totalUsd: '$4,286.40',
  assets: [
    { symbol: 'BTC', name: 'Bitcoin', amount: '0.0612 BTC', usd: '$4,103.21' },
    { symbol: 'STX', name: 'Stacks', amount: '254.12 STX', usd: '$183.19' },
    { symbol: 'USDCx', name: 'USDCx', amount: '0 USDCx', usd: '$0.00' },
  ],
};

export const mockDappOrigin = 'https://dapp.example';

type ComplianceReviewKind = 'send' | 'multisig' | 'psbt' | 'contract-call';

type ComplianceRefusalKind = 'recipientRefused' | 'counterpartyRefused' | 'multisigRefused';

interface ComplianceReviewRow {
  label: string;
  value: string;
}

export interface ComplianceReview {
  kind: ComplianceReviewKind;
  title: string;
  origin?: string;
  amount: string;
  amountUsd: string;
  rows: ComplianceReviewRow[];
  primaryAction: string;
  refusal: ComplianceRefusalKind;
}

export const complianceReviews = {
  send: {
    kind: 'send',
    title: 'Review',
    amount: '0.05 BTC',
    amountUsd: '$3,352.50',
    rows: [
      { label: 'From', value: 'Account 1 · bc1q…7x4k' },
      { label: 'To', value: 'bc1q…m9t2' },
      { label: 'Fee', value: '0.00000840 BTC' },
      { label: 'Estimated time', value: '~30 min' },
    ],
    primaryAction: 'Confirm and send',
    refusal: 'recipientRefused',
  },
  multisig: {
    kind: 'multisig',
    title: 'Review proposal',
    amount: '1,200 STX',
    amountUsd: '$865.20',
    rows: [
      { label: 'Multisig', value: 'Treasury · 2 of 3' },
      { label: 'Members', value: 'SP2J…9EJ7, SP3K…Q4MZ, SP1H…TA2W' },
      { label: 'To', value: 'SP3D…8VXR' },
      { label: 'Fee', value: '0.002 STX' },
    ],
    primaryAction: 'Propose',
    refusal: 'multisigRefused',
  },
  psbt: {
    kind: 'psbt',
    title: 'Sign transaction',
    origin: mockDappOrigin,
    amount: '−0.012 BTC',
    amountUsd: '$804.60',
    rows: [
      { label: 'Method', value: 'signPsbt' },
      { label: 'Inputs', value: '2 · Account 1' },
      { label: 'Outputs', value: '3 · bc1p…k2dq' },
      { label: 'Fee', value: '0.00001120 BTC' },
    ],
    primaryAction: 'Approve',
    refusal: 'counterpartyRefused',
  },
  contractCall: {
    kind: 'contract-call',
    title: 'Approve contract call',
    origin: mockDappOrigin,
    amount: '−50 STX',
    amountUsd: '$36.05',
    rows: [
      { label: 'Contract', value: 'SP3K…Q4MZ.dapp-vault' },
      { label: 'Function', value: 'deposit' },
      { label: 'Post conditions', value: 'Account 1 sends 50 STX' },
      { label: 'Fee', value: '0.003 STX' },
    ],
    primaryAction: 'Approve',
    refusal: 'counterpartyRefused',
  },
} satisfies Record<string, ComplianceReview>;

interface ComplianceMailContext {
  platform: CompliancePlatform;
  time: Date;
  referenceId: string;
}

const mockAppVersions = {
  extension: '7.14.0',
  mobile: '2.31.0',
} satisfies Record<CompliancePlatform, string>;

const platformLabels = {
  extension: 'Browser extension',
  mobile: 'Mobile',
} satisfies Record<CompliancePlatform, string>;

export const mockMailContext = {
  time: new Date('2026-11-09T14:32:00Z'),
  referenceId: 'LTH-7Q2K-91XD',
};

export type ComplianceMailKind = 'dispute' | 'support';

export function createComplianceMail(kind: ComplianceMailKind, context: ComplianceMailContext) {
  const subject =
    kind === 'dispute' ? complianceCopy.mail.disputeSubject : complianceCopy.mail.supportSubject;
  const body = [
    '',
    '',
    complianceCopy.mail.filledInHeading,
    `App version: ${mockAppVersions[context.platform]}`,
    `Platform: ${platformLabels[context.platform]}`,
    `Time: ${context.time.toISOString()}`,
    `Reference ID: ${context.referenceId}`,
  ].join('\n');
  const href = `mailto:${complianceInbox}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { to: complianceInbox, subject, body, href };
}

export function createComplianceMailHref(kind: ComplianceMailKind, platform: CompliancePlatform) {
  return createComplianceMail(kind, { platform, ...mockMailContext }).href;
}
