import messageBip322Capture from '../captures/message-bip322.png';
import messageStructuredCapture from '../captures/message-structured.png';
import messageUtf8Capture from '../captures/message-utf8.png';
import type { ApprovalScreen } from './scenario-types';

export const messageScreens: ApprovalScreen[] = [
  {
    id: 'message-utf8',
    section: 'messages',
    title: 'Plain-text message',
    summary: 'A sign-in message with a nonce.',
    journeyId: 'sign-message',
    variantId: 'utf8',
    wallet: 'software',
    stage: 'reviewing',
    capture: messageUtf8Capture,
    issues: ['Nothing says signing moves no funds and costs no fee.'],
  },
  {
    id: 'message-structured',
    section: 'messages',
    title: 'Structured data (SIP-018)',
    summary: 'A marketplace listing signed as structured data.',
    journeyId: 'sign-message',
    variantId: 'structured',
    wallet: 'software',
    stage: 'reviewing',
    capture: messageStructuredCapture,
    issues: ['Structured data is shown as raw Clarity with no domain called out.'],
  },
  {
    id: 'message-bip322',
    section: 'messages',
    title: 'Bitcoin message (BIP-322)',
    summary: 'Proof of address ownership.',
    journeyId: 'sign-message',
    variantId: 'bip322',
    wallet: 'software',
    stage: 'reviewing',
    capture: messageBip322Capture,
    issues: ['The signing address type is not shown.'],
  },
];
