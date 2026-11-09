import ledgerConnectCapture from '../captures/ledger-connect.png';
import ledgerDisconnectedCapture from '../captures/ledger-disconnected.png';
import ledgerRejectedCapture from '../captures/ledger-rejected.png';
import type { ApprovalScreen } from './scenario-types';

export const ledgerScreens: ApprovalScreen[] = [
  {
    id: 'ledger-connect',
    section: 'ledger',
    title: 'Connect the device',
    summary: 'The device sheet before the Ledger is found.',
    journeyId: 'leather-send',
    variantId: 'stx',
    wallet: 'ledger',
    stage: 'awaiting-device',
    ledgerState: 'connect',
    capture: ledgerConnectCapture,
    issues: ['Today the Ledger flow leaves the request behind for a separate full-screen flow.'],
  },
  {
    id: 'ledger-sign',
    section: 'ledger',
    title: 'Approve on the device',
    summary: 'The request stays visible behind the device sheet.',
    journeyId: 'leather-send',
    variantId: 'btc',
    wallet: 'ledger',
    stage: 'awaiting-device',
    ledgerState: 'sign',
    captureNote:
      'The current extension only reaches this step with a physical Ledger, so there is no capture.',
    issues: [],
  },
  {
    id: 'ledger-rejected',
    section: 'ledger',
    title: 'Rejected on the device',
    summary: 'Nothing signed; the request can be reviewed again.',
    journeyId: 'leather-send',
    variantId: 'btc',
    wallet: 'ledger',
    stage: 'awaiting-device',
    ledgerState: 'rejected',
    capture: ledgerRejectedCapture,
    issues: [],
  },
  {
    id: 'ledger-disconnected',
    section: 'ledger',
    title: 'Device disconnected',
    summary: 'The device went away mid-request.',
    journeyId: 'sign-message',
    variantId: 'utf8',
    wallet: 'ledger',
    stage: 'awaiting-device',
    ledgerState: 'disconnected',
    capture: ledgerDisconnectedCapture,
    issues: [],
  },
];
