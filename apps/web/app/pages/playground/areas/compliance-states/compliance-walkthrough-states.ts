export const walkthroughStates = [
  {
    id: 'restore-lockout',
    scenario: 'S1',
    title: 'Restore → lockout',
    description:
      'Restoring a wallet whose address is restricted locks Leather once screening ends.',
  },
  {
    id: 'home-lockout',
    scenario: 'S2',
    title: 'Home → lockout',
    description: 'Opening Leather screens every address; a match replaces Home with the lockout.',
  },
  {
    id: 'lockout',
    scenario: 'S3',
    title: 'Lockout',
    description: 'The whole app is locked. Both actions lead on to the next states.',
  },
  {
    id: 'why',
    scenario: 'S3a',
    title: 'Why Leather is locked',
    description: 'Wallets 1 and 3 were created in Leather, Wallet 2 imported, plus a Ledger.',
  },
  {
    id: 'key-backup',
    scenario: 'S3b',
    title: 'Key backup',
    description: 'Any password unlocks the mock Secret Key.',
  },
  {
    id: 'dispute-email',
    scenario: 'S3c',
    title: 'Dispute email',
    description: 'The prefilled draft that Dispute this opens.',
  },
  {
    id: 'review-clean',
    scenario: 'S11',
    title: 'Send review, clean',
    description: 'Footer actions shimmer during screening, then the send can be confirmed.',
  },
  {
    id: 'review-flagged',
    scenario: 'S11a',
    title: 'Send review, flagged recipient',
    description: 'Screening flags the recipient; Close replaces the primary action.',
  },
  {
    id: 'review-no-answer',
    scenario: 'S11b',
    title: 'Send review, no answer',
    description: 'Screening returns no verdict; Try again screens again and clears.',
  },
  {
    id: 'approve-clean',
    scenario: 'S12',
    title: 'dApp approval, clean',
    description: 'A signPsbt request from a dApp clears screening.',
  },
  {
    id: 'approve-flagged',
    scenario: 'S12a',
    title: 'dApp approval, flagged counterparty',
    description: 'A contract call with a restricted counterparty is refused.',
  },
  {
    id: 'approve-no-answer',
    scenario: 'S12b',
    title: 'dApp approval, no answer',
    description: 'Nothing is signed without a verdict.',
  },
] as const;

export type WalkthroughStateId = (typeof walkthroughStates)[number]['id'];
