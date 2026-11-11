import { matchBondTemplateDescriptor } from '@leather.io/bitcoin';

import type { BondSpendingConditionsProps } from '@app/components/bond-spending-conditions/bond-spending-conditions';

type TimelockedDescriptorDetails = BondSpendingConditionsProps;

export function matchTimelockedDescriptor(descriptor: string): TimelockedDescriptorDetails | null {
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

export function getTimelockedPolicySubject({ vaultKind }: TimelockedDescriptorDetails) {
  return vaultKind === 'pk' ? 'this timelocked address' : 'this vault';
}
