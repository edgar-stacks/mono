import { matchBondTemplateDescriptor } from '@leather.io/bitcoin';

import {
  type BondSpendingConditionsProps,
  type BondVaultKind,
} from '@app/components/bond-spending-conditions';

export const timelockedVerifyCalloutMessage =
  "Timelocked addresses can't be added to your wallet. You're only verifying the address.";

export function matchTimelockedDescriptor(descriptor: string): BondSpendingConditionsProps | null {
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

export function getTimelockedPolicySubject(vaultKind: BondVaultKind) {
  return vaultKind === 'pk' ? 'this timelocked address' : 'this vault';
}
