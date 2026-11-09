import bnsRegisterCapture from '../captures/bns-register.png';
import genericLimitedCapture from '../captures/generic-limited.png';
import genericUnlimitedCapture from '../captures/generic-unlimited.png';
import stackingDelegateCapture from '../captures/stacking-delegate.png';
import zestSupplyCapture from '../captures/zest-supply.png';
import type { ApprovalScreen } from './scenario-types';

export const contractCallScreens: ApprovalScreen[] = [
  {
    id: 'zest-supply',
    section: 'contract-calls',
    title: 'Zest supply',
    summary: 'Supplying sBTC and receiving zsBTC.',
    journeyId: 'zest-supply',
    variantId: 'supply',
    wallet: 'software',
    stage: 'reviewing',
    capture: zestSupplyCapture,
    issues: ['What comes back is not shown at all today.'],
  },
  {
    id: 'stacking-delegate',
    section: 'contract-calls',
    title: 'Delegate to a pool',
    summary: 'A fee-only call that locks nothing in the transaction itself.',
    journeyId: 'stacking',
    variantId: 'delegate',
    wallet: 'software',
    stage: 'reviewing',
    capture: stackingDelegateCapture,
    issues: [],
  },
  {
    id: 'bns-register',
    section: 'contract-calls',
    title: 'Register a BNS name',
    summary: 'A name purchase with an exact STX limit.',
    journeyId: 'bns',
    variantId: 'register',
    wallet: 'software',
    stage: 'reviewing',
    capture: bnsRegisterCapture,
    issues: [],
  },
  {
    id: 'generic-limited',
    section: 'contract-calls',
    title: 'Unmapped call with limits',
    summary: 'An unknown contract with an at-most limit.',
    journeyId: 'contract-call-limited',
    variantId: 'stx',
    wallet: 'software',
    stage: 'reviewing',
    capture: genericLimitedCapture,
    issues: ['An unverified site gets the same treatment as a known one.'],
  },
  {
    id: 'generic-unlimited',
    section: 'contract-calls',
    title: 'Unmapped call without limits',
    summary: 'No limits, so no estimated movements are shown.',
    journeyId: 'contract-call-unlimited',
    variantId: 'none',
    wallet: 'software',
    stage: 'reviewing',
    capture: genericUnlimitedCapture,
    issues: ['Today the screen implies nothing moves when nothing is enforced.'],
  },
];
