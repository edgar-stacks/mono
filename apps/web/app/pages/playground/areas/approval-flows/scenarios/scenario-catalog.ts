import { connectScreens } from './connect-screens';
import { contractCallScreens } from './contract-call-screens';
import { ledgerScreens } from './ledger-screens';
import { messageScreens } from './message-screens';
import { outcomeScreens } from './outcome-screens';
import type { ApprovalScreen, ApprovalSection } from './scenario-types';
import { transactionScreens } from './transaction-screens';
import { vaultScreens } from './vault-screens';

export const approvalSections: ApprovalSection[] = [
  { id: 'connect', label: 'Connect' },
  { id: 'messages', label: 'Messages' },
  { id: 'transactions', label: 'Sends, swaps and PSBTs' },
  { id: 'contract-calls', label: 'Contract calls' },
  { id: 'vaults', label: 'Vaults' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'outcomes', label: 'After signing' },
];

export const approvalScreens: ApprovalScreen[] = [
  ...connectScreens,
  ...messageScreens,
  ...transactionScreens,
  ...contractCallScreens,
  ...vaultScreens,
  ...ledgerScreens,
  ...outcomeScreens,
];

export function findApprovalScreen(screenId: string | null) {
  return approvalScreens.find(screen => screen.id === screenId);
}
