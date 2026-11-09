import appStacksSignOnlyCapture from '../captures/app-stacks-sign-only.png';
import psbtSignOnlyCapture from '../captures/psbt-sign-only.png';
import sendBtcCapture from '../captures/send-btc.png';
import sendSbtcCapture from '../captures/send-sbtc.png';
import sendStxCapture from '../captures/send-stx.png';
import swapStxSbtcCapture from '../captures/swap-stx-sbtc.png';
import type { ApprovalScreen } from './scenario-types';

export const transactionScreens: ApprovalScreen[] = [
  {
    id: 'send-btc',
    section: 'transactions',
    title: 'Send BTC',
    summary: 'A Bitcoin send from the Leather web app.',
    journeyId: 'leather-send',
    variantId: 'btc',
    wallet: 'software',
    stage: 'reviewing',
    capture: sendBtcCapture,
    issues: ['The fee and the amount compete for attention in the current layout.'],
  },
  {
    id: 'send-stx',
    section: 'transactions',
    title: 'Send STX',
    summary: 'A Stacks send from the Leather web app.',
    journeyId: 'leather-send',
    variantId: 'stx',
    wallet: 'software',
    stage: 'reviewing',
    capture: sendStxCapture,
    issues: [],
  },
  {
    id: 'send-sbtc',
    section: 'transactions',
    title: 'Send sBTC',
    summary: 'A SIP-010 send with an exact limit.',
    journeyId: 'leather-send',
    variantId: 'sbtc',
    wallet: 'software',
    stage: 'reviewing',
    capture: sendSbtcCapture,
    issues: ['Post-conditions are shown as raw conditions instead of limits.'],
  },
  {
    id: 'swap-stx-sbtc',
    section: 'transactions',
    title: 'Swap STX → sBTC',
    summary: 'A swap with a minimum received.',
    journeyId: 'leather-swap',
    variantId: 'stx-sbtc',
    wallet: 'software',
    stage: 'reviewing',
    capture: swapStxSbtcCapture,
    issues: ['The minimum received is buried in post-conditions.'],
  },
  {
    id: 'psbt-sign-only',
    section: 'transactions',
    title: 'Sign a PSBT',
    summary: 'A marketplace purchase signed but not broadcast.',
    journeyId: 'psbt',
    variantId: 'sign-only',
    wallet: 'software',
    stage: 'reviewing',
    capture: psbtSignOnlyCapture,
    issues: ['Sign-only and broadcast requests look identical today.'],
  },
  {
    id: 'app-stacks-sign-only',
    section: 'transactions',
    title: 'Sign a Stacks transaction',
    summary: 'An app-built transaction returned unsigned to the app.',
    journeyId: 'app-stacks-transaction',
    variantId: 'sign-only',
    wallet: 'software',
    stage: 'reviewing',
    capture: appStacksSignOnlyCapture,
    issues: [],
  },
];
