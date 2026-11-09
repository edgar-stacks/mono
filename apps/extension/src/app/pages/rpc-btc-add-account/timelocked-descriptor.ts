import { matchBondTemplateDescriptor } from '@leather.io/bitcoin';

import type { BondSpendingConditionsDetails } from '@app/components/bond-spending-conditions';

export function matchTimelockedDescriptor(
  descriptor: string
): BondSpendingConditionsDetails | null {
  const bond = matchBondTemplateDescriptor(descriptor);
  if (!bond) return null;

  return {
    unlockHeight: bond.unlockHeight,
    hash: bond.hash,
    counterpartyKey: bond.counterpartyKey,
    vaultKind: bond.vault.kind,
    vaultThreshold: bond.vault.requiredSignatures,
    vaultKeyExpressions: bond.vault.keys,
  };
}
