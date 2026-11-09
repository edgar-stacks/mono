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
    backupLink: 'Back up {walletName} Secret Key',
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
    passwordPrompt: 'Enter your password to view Wallet 1’s Secret Key.',
    keyTitle: 'Wallet 1 Secret Key',
    warning: 'Never share it. Anyone with these words controls the funds.',
    passwordLabel: 'Password',
    continue: 'Continue',
    reveal: 'Click to reveal',
    done: 'I’ve backed it up',
  },
  review: {
    sendTitle: 'Review',
    send: 'Send',
    multisigTitle: 'Review proposal',
    propose: 'Propose',
    approve: 'Approve',
    from: 'From',
    to: 'To',
    fee: 'Fee',
    arrives: 'Arrives',
  },
  email: {
    disputeSubject: 'Dispute: Leather account restricted',
    disputeIntro: 'Tell us why you think this is a mistake:',
    supportSubject: 'Transaction couldn’t be completed',
    supportIntro: 'Tell us what you were trying to do:',
    filledInByLeather: '— Filled in by Leather —',
  },
};

type ComplianceCopyGroupId = keyof typeof complianceCopy;

export const copyDeckGroups: { id: ComplianceCopyGroupId; label: string }[] = [
  { id: 'lockout', label: 'Lockout' },
  { id: 'why', label: 'Why Leather is locked' },
  { id: 'recipientRefused', label: 'Refusal: recipient' },
  { id: 'counterpartyRefused', label: 'Refusal: counterparty' },
  { id: 'multisigRefused', label: 'Refusal: multisig member' },
  { id: 'actions', label: 'Actions' },
  { id: 'noAnswer', label: 'No answer' },
  { id: 'keyBackup', label: 'Key backup' },
  { id: 'review', label: 'Review' },
  { id: 'email', label: 'Emails' },
];

export function backupLinkLabel(walletName: string) {
  return complianceCopy.why.backupLink.replace('{walletName}', walletName);
}

type WalletOrigin = 'created' | 'imported' | 'ledger';

export interface MockWallet {
  id: string;
  name: string;
  origin: WalletOrigin;
}

export function walletsWithBackup(wallets: MockWallet[]) {
  return wallets.filter(wallet => wallet.origin === 'created');
}

export const walletSets = {
  createdWallet: [{ id: 'wallet-1', name: 'Wallet 1', origin: 'created' }],
  importedWallet: [{ id: 'wallet-1', name: 'Wallet 1', origin: 'imported' }],
  severalWallets: [
    { id: 'wallet-1', name: 'Wallet 1', origin: 'created' },
    { id: 'wallet-2', name: 'Wallet 2', origin: 'imported' },
    { id: 'wallet-3', name: 'Wallet 3', origin: 'created' },
    { id: 'ledger', name: 'Ledger', origin: 'ledger' },
  ],
} satisfies Record<string, MockWallet[]>;

export const mockSecretKey = [
  'orbit',
  'lamp',
  'velvet',
  'canyon',
  'harbor',
  'pilot',
  'quote',
  'mango',
  'silent',
  'ripple',
  'frost',
  'wagon',
];

interface MockBalance {
  symbol: string;
  name: string;
  amount: string;
  fiat: string;
}

export const mockAccount = {
  name: 'Account 1',
  totalFiat: '$4,812.36',
  balances: [
    { symbol: 'BTC', name: 'Bitcoin', amount: '0.0712', fiat: '$4,390.12' },
    { symbol: 'STX', name: 'Stacks', amount: '402.18', fiat: '$422.24' },
    { symbol: 'USDCx', name: 'USDC', amount: '0', fiat: '$0.00' },
  ] satisfies MockBalance[],
};

export const mockSendReview = {
  amount: '0.05 BTC',
  fiat: '$3,083.20',
  from: 'Account 1',
  recipient: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  fee: '0.00002810 BTC',
  arrival: '~30 min',
};

export const mockDappOrigin = 'https://dapp.example';

export const mockDappRequests = {
  signPsbt: {
    method: 'signPsbt',
    title: 'Sign transaction',
    rows: [
      { label: 'Inputs', value: '2 from Account 1' },
      { label: 'Outputs', value: 'bc1p8k…4qzs · 0.012 BTC' },
      { label: 'Fee', value: '0.00001930 BTC' },
    ],
  },
  contractCall: {
    method: 'stx_callContract',
    title: 'Approve contract call',
    rows: [
      { label: 'Contract', value: 'SP2C2…XG3V.swap-v2' },
      { label: 'Function', value: 'swap-exact-tokens' },
      { label: 'Fee', value: '0.003 STX' },
    ],
  },
};

export type MockDappRequestId = keyof typeof mockDappRequests;

export const mockMultisigReview = {
  name: 'Treasury vault',
  threshold: '2 of 3',
  amount: '0.25 BTC',
  members: [
    { name: 'You', address: 'bc1q9h…6mkt', flagged: false },
    { name: 'Ana', address: 'bc1qt5…2xra', flagged: false },
    { name: 'Member 3', address: 'bc1qw0…8d7c', flagged: true },
  ],
};

export const screeningDurationMs = 1600;

const complianceInbox = 'compliance@leather.io';

const mockReferenceId = 'LTHR-7Q4K-2M9X';

export type CompliancePlatform = 'extension' | 'mobile';

const platformDetails: Record<CompliancePlatform, { appVersion: string; platform: string }> = {
  extension: { appVersion: '6.82.0', platform: 'Extension (Chrome)' },
  mobile: { appVersion: '2.31.0', platform: 'Mobile (iOS)' },
};

type ComplianceEmailKind = 'dispute' | 'support';

export function complianceEmail(kind: ComplianceEmailKind, platform: CompliancePlatform) {
  const details = platformDetails[platform];
  const copy = complianceCopy.email;
  const subject = kind === 'dispute' ? copy.disputeSubject : copy.supportSubject;
  const body = [
    kind === 'dispute' ? copy.disputeIntro : copy.supportIntro,
    '',
    '',
    copy.filledInByLeather,
    `App version: ${details.appVersion}`,
    `Platform: ${details.platform}`,
    `Time: ${new Date().toISOString()}`,
    `Reference ID: ${mockReferenceId}`,
  ].join('\n');

  return {
    to: complianceInbox,
    subject,
    body,
    href: `mailto:${complianceInbox}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}
