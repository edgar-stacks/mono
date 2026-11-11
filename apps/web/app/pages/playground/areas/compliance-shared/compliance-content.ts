const complianceInbox = 'compliance@example.com';

export const screeningDurationMs = 1600;

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
    backup(walletName: string) {
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
  email: {
    disputeSubject: 'Dispute: Leather account restricted',
    supportSubject: 'Transaction couldn’t be completed',
    filledIn: '— Filled in by Leather —',
  },
};

export type ComplianceVerdict = 'screening' | 'clean' | 'flagged' | 'no-answer';

type WalletOrigin = 'created' | 'imported' | 'ledger';

export interface ComplianceWallet {
  id: string;
  name: string;
  origin: WalletOrigin;
}

export const mockWallets = {
  created: [{ id: 'wallet-1', name: 'Wallet 1', origin: 'created' }],
  imported: [{ id: 'wallet-1', name: 'Wallet 1', origin: 'imported' }],
  several: [
    { id: 'wallet-1', name: 'Wallet 1', origin: 'created' },
    { id: 'wallet-2', name: 'Wallet 2', origin: 'imported' },
    { id: 'wallet-3', name: 'Wallet 3', origin: 'created' },
    { id: 'ledger', name: 'Ledger', origin: 'ledger' },
  ],
} satisfies Record<string, ComplianceWallet[]>;

export function getBackupWallets(wallets: ComplianceWallet[]) {
  return wallets.filter(wallet => wallet.origin === 'created');
}

export const mockSecretKey = [
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'about',
];

interface ComplianceAsset {
  symbol: string;
  name: string;
  balance: string;
  fiat: string;
}

export const mockAccount = {
  name: 'Account 1',
  totalFiat: '$16,437.12',
  assets: [
    { symbol: 'BTC', name: 'Bitcoin', balance: '0.2481', fiat: '$15,912.40' },
    { symbol: 'STX', name: 'Stacks', balance: '842.50', fiat: '$524.72' },
    { symbol: 'USDCx', name: 'USDCx', balance: '0', fiat: '$0.00' },
  ] satisfies ComplianceAsset[],
};

export const mockSendReview = {
  amount: '0.05 BTC',
  fiat: '$3,207.50',
  from: mockAccount.name,
  recipient: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  fee: '0.00000840 BTC',
  total: '0.0500084 BTC',
};

export const dappOrigin = 'https://dapp.example';

export const mockApprovals = {
  signPsbt: {
    method: 'signPsbt',
    title: 'Sign transaction',
    rows: [
      { label: 'Inputs', value: '1 from Account 1' },
      { label: 'You send', value: '0.012 BTC' },
      { label: 'Fee', value: '0.00000612 BTC' },
    ],
  },
  contractCall: {
    method: 'stx_callContract',
    title: 'Call contract',
    rows: [
      { label: 'Contract', value: 'SP2C2…P9Y.swap-v2' },
      { label: 'Function', value: 'swap-exact-tokens' },
      { label: 'Fee', value: '0.003 STX' },
    ],
  },
};

export type ApprovalKind = keyof typeof mockApprovals;

export const mockMultisig = {
  name: 'Treasury',
  threshold: '2 of 3',
  members: ['Account 1', 'SP3FB…V3K', 'SP1HT…Q7M'],
  amount: '1,200 STX',
  recipient: 'SP2J6…9EJ7',
};

export interface MailContext {
  appVersion: string;
  platform: string;
  time: string;
  referenceId: string;
}

export const mockMailContexts = {
  extension: {
    appVersion: '6.80.0',
    platform: 'Extension, Chrome 142 on macOS',
    time: '2026-11-09 07:41 UTC',
    referenceId: 'CMP-7F3K-92QD',
  },
  mobile: {
    appVersion: '3.14.0',
    platform: 'Mobile, iOS 26.1',
    time: '2026-11-09 07:41 UTC',
    referenceId: 'CMP-7F3K-92QD',
  },
} satisfies Record<string, MailContext>;

export interface MailDraft {
  to: string;
  subject: string;
  body: string;
}

function createFilledInBlock(context: MailContext) {
  return [
    complianceCopy.email.filledIn,
    `App version: ${context.appVersion}`,
    `Platform: ${context.platform}`,
    `Time: ${context.time}`,
    `Reference ID: ${context.referenceId}`,
  ].join('\n');
}

export function createDisputeDraft(context: MailContext): MailDraft {
  return {
    to: complianceInbox,
    subject: complianceCopy.email.disputeSubject,
    body: `\n\n${createFilledInBlock(context)}`,
  };
}

export function createSupportDraft(context: MailContext): MailDraft {
  return {
    to: complianceInbox,
    subject: complianceCopy.email.supportSubject,
    body: `\n\n${createFilledInBlock(context)}`,
  };
}

export function toMailtoHref({ to, subject, body }: MailDraft) {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function openMailDraft(draft: MailDraft) {
  window.location.assign(toMailtoHref(draft));
}
