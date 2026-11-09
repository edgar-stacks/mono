import connectFirstCapture from '../captures/connect-first.png';
import connectLedgerCapture from '../captures/connect-ledger.png';
import type { ApprovalScreen } from './scenario-types';

export const connectScreens: ApprovalScreen[] = [
  {
    id: 'connect-first',
    section: 'connect',
    title: 'First connection',
    summary: 'An app asks for addresses for the first time.',
    journeyId: 'connect',
    variantId: 'first',
    wallet: 'software',
    stage: 'reviewing',
    capture: connectFirstCapture,
    issues: [
      'Today the requester sits in small type above the fold; reviewers miss which site is asking.',
      'The account being shared is not named, only its addresses.',
    ],
  },
  {
    id: 'connect-ledger',
    section: 'connect',
    title: 'Connect a Ledger account',
    summary: 'Sharing a known Ledger account needs no device signature.',
    journeyId: 'connect',
    variantId: 'first',
    wallet: 'ledger',
    stage: 'reviewing',
    capture: connectLedgerCapture,
    issues: ['Today the Ledger flow asks to connect the device even when the keys are known.'],
  },
];
