import vaultBitcoinProposeCapture from '../captures/vault-bitcoin-propose.png';
import vaultStacksCoSignCapture from '../captures/vault-stacks-co-sign.png';
import type { ApprovalScreen } from './scenario-types';

export const vaultScreens: ApprovalScreen[] = [
  {
    id: 'vault-bitcoin-propose',
    section: 'vaults',
    title: 'Propose from a Bitcoin vault',
    summary: 'Vault funds identified separately from the personal signer.',
    journeyId: 'vault',
    variantId: 'bitcoin-propose',
    wallet: 'software',
    stage: 'reviewing',
    capture: vaultBitcoinProposeCapture,
    issues: ['The current flow names only the signing account, not the vault.'],
  },
  {
    id: 'vault-stacks-co-sign',
    section: 'vaults',
    title: 'Co-sign from a Stacks vault',
    summary: 'The second signature reaches the threshold.',
    journeyId: 'vault',
    variantId: 'stacks-co-sign',
    wallet: 'software',
    stage: 'reviewing',
    capture: vaultStacksCoSignCapture,
    issues: [],
  },
  {
    id: 'vault-bitcoin-broadcast',
    section: 'vaults',
    title: 'Broadcast a Bitcoin vault payment',
    summary: 'All signatures collected; the fee comes from the vault.',
    journeyId: 'vault',
    variantId: 'bitcoin-broadcast',
    wallet: 'software',
    stage: 'reviewing',
    captureNote: 'The current extension has no screen for broadcasting a vault payment.',
    issues: [],
  },
];
