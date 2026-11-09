import { appTransactionScenarios } from '../scenarios/app-transaction-scenarios';
import type {
  ApprovalRequest,
  ApprovalScenario,
  ApprovalScenarioVariant,
  ApprovalWalletKind,
} from '../scenarios/approval-scenario.types';
import { connectScenarios } from '../scenarios/connect-scenarios';
import { contractCallScenarios } from '../scenarios/contract-call-scenarios';
import { defiScenarios } from '../scenarios/defi-scenarios';
import { leatherScenarios } from '../scenarios/leather-scenarios';
import { messageScenarios } from '../scenarios/message-scenarios';
import { stackingScenarios } from '../scenarios/stacking-scenarios';
import { vaultScenarios } from '../scenarios/vault-scenarios';
import { journeyAccounts } from './journey-world';

export const journeyFamilies: ApprovalScenario[] = [
  ...connectScenarios,
  ...messageScenarios,
  ...leatherScenarios,
  ...appTransactionScenarios,
  ...vaultScenarios,
  ...defiScenarios,
  ...stackingScenarios,
  ...contractCallScenarios,
];

export interface ResolvedJourney {
  family: ApprovalScenario;
  variant: ApprovalScenarioVariant;
  wallet: ApprovalWalletKind;
  request: ApprovalRequest;
}

export function resolveJourney({
  familyId,
  variantId,
  wallet = 'software',
}: {
  familyId?: string | null;
  variantId?: string | null;
  wallet?: ApprovalWalletKind;
}): ResolvedJourney {
  const family = journeyFamilies.find(candidate => candidate.id === familyId) ?? journeyFamilies[0];
  const variant =
    family.variants.find(candidate => candidate.id === variantId) ?? family.variants[0];
  return { family, variant, wallet, request: variant.build(journeyAccounts(wallet)) };
}

export function createsTransaction(request: ApprovalRequest) {
  if (request.kind === 'connect' || request.kind === 'message') return false;
  return request.mode === 'broadcast';
}

export function needsDeviceSignature(request: ApprovalRequest) {
  if (request.kind === 'connect' || request.alreadySigned) return false;
  const signer = request.signer ?? request.account;
  return signer.kind === 'ledger';
}
