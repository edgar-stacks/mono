import type { ComplianceVerdict } from '../compliance-shared/compliance-content';

type DemoScreen =
  | 'restore'
  | 'home'
  | 'lockout'
  | 'why'
  | 'key-backup'
  | 'dispute-email'
  | 'send-review'
  | 'approval';

export type ScreeningResult = Exclude<ComplianceVerdict, 'screening'>;

export interface ComplianceDemoState {
  id: string;
  scenario: string;
  title: string;
  description: string;
  screen: DemoScreen;
  result?: ScreeningResult;
  holdMs: number;
}

const shortHoldMs = 4000;
const longHoldMs = 6000;

export const complianceDemoStates: ComplianceDemoState[] = [
  {
    id: 'restore',
    scenario: 'S1',
    title: 'Restore → lockout',
    description:
      'A restricted Secret Key is restored. Screening runs before Home, then the app locks.',
    screen: 'restore',
    holdMs: longHoldMs,
  },
  {
    id: 'home',
    scenario: 'S2',
    title: 'Home → lockout',
    description:
      'An existing wallet opens Home. Balances shimmer while screening runs, then the app locks.',
    screen: 'home',
    holdMs: longHoldMs,
  },
  {
    id: 'lockout',
    scenario: 'S3',
    title: 'Lockout',
    description: 'Every surface shows the lockout. Nothing else in the app is reachable.',
    screen: 'lockout',
    holdMs: shortHoldMs,
  },
  {
    id: 'why',
    scenario: 'S3a',
    title: 'Why Leather is locked',
    description: 'Wallets 1 and 3 were created in Leather, so only they get a backup link.',
    screen: 'why',
    holdMs: shortHoldMs,
  },
  {
    id: 'key-backup',
    scenario: 'S3b',
    title: 'Key backup',
    description: 'The password unlocks the Secret Key, hidden until clicked.',
    screen: 'key-backup',
    holdMs: shortHoldMs,
  },
  {
    id: 'dispute-email',
    scenario: 'S3c',
    title: 'Dispute email',
    description: 'Dispute this opens a mail draft to the compliance inbox, prefilled by Leather.',
    screen: 'dispute-email',
    holdMs: shortHoldMs,
  },
  {
    id: 'review-clean',
    scenario: 'S11',
    title: 'Review, clean',
    description: 'The recipient is screened while the footer shimmers, then Send unlocks.',
    screen: 'send-review',
    result: 'clean',
    holdMs: shortHoldMs,
  },
  {
    id: 'review-flagged',
    scenario: 'S11a',
    title: 'Review, flagged recipient',
    description: 'The recipient is restricted. Nothing is sent and the wallet stays usable.',
    screen: 'send-review',
    result: 'flagged',
    holdMs: shortHoldMs,
  },
  {
    id: 'review-no-answer',
    scenario: 'S11b',
    title: 'Review, no answer',
    description:
      'Screening does not answer, so Send stays unavailable until Try again gets a verdict.',
    screen: 'send-review',
    result: 'no-answer',
    holdMs: shortHoldMs,
  },
  {
    id: 'approve-clean',
    scenario: 'S12',
    title: 'Approve, clean',
    description: 'A dApp asks to sign a PSBT. The counterparty is screened, then Approve unlocks.',
    screen: 'approval',
    result: 'clean',
    holdMs: shortHoldMs,
  },
  {
    id: 'approve-flagged',
    scenario: 'S12a',
    title: 'Approve, flagged counterparty',
    description: 'Another party is restricted. Nothing is signed.',
    screen: 'approval',
    result: 'flagged',
    holdMs: shortHoldMs,
  },
  {
    id: 'approve-no-answer',
    scenario: 'S12b',
    title: 'Approve, no answer',
    description: 'Screening does not answer, so nothing is signed without a verdict.',
    screen: 'approval',
    result: 'no-answer',
    holdMs: shortHoldMs,
  },
];
