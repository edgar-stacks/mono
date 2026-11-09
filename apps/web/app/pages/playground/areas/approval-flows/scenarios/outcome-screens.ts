import type { ApprovalScreen } from './scenario-types';

export const outcomeScreens: ApprovalScreen[] = [
  {
    id: 'outcome-pending',
    section: 'outcomes',
    title: 'Submitted',
    summary: 'Pending is not confirmed.',
    journeyId: 'leather-send',
    variantId: 'btc',
    wallet: 'software',
    stage: 'pending',
    captureNote:
      'The current extension closes the popup after approval, so there is no matching screen.',
    issues: ['Today the popup closes on submit, so pending reads as done.'],
  },
  {
    id: 'outcome-confirmed',
    section: 'outcomes',
    title: 'Confirmed',
    summary: 'Only now does the portfolio change.',
    journeyId: 'leather-send',
    variantId: 'btc',
    wallet: 'software',
    stage: 'confirmed',
    captureNote:
      'The current extension closes the popup after approval, so there is no matching screen.',
    issues: [],
  },
  {
    id: 'outcome-signed',
    section: 'outcomes',
    title: 'Signed, not broadcast',
    summary: 'A sign-only request creates no transaction.',
    journeyId: 'psbt',
    variantId: 'sign-only',
    wallet: 'software',
    stage: 'signed',
    captureNote:
      'The current extension closes the popup after approval, so there is no matching screen.',
    issues: [],
  },
  {
    id: 'outcome-failed-broadcast',
    section: 'outcomes',
    title: 'Broadcast failed',
    summary: 'Rejected before submission: no fee.',
    journeyId: 'leather-send',
    variantId: 'stx',
    wallet: 'software',
    stage: 'failed',
    failure: 'pre-broadcast',
    captureNote:
      'The current extension closes the popup after approval, so there is no matching screen.',
    issues: [],
  },
  {
    id: 'outcome-failed-on-chain',
    section: 'outcomes',
    title: 'Failed on the network',
    summary: 'Submitted and failed: the fee is kept.',
    journeyId: 'bitflow-swap',
    variantId: 'stx-sbtc',
    wallet: 'software',
    stage: 'failed',
    failure: 'submitted',
    captureNote:
      'The current extension closes the popup after approval, so there is no matching screen.',
    issues: ['Today a failed contract call shows the same check mark as a success for a moment.'],
  },
];
