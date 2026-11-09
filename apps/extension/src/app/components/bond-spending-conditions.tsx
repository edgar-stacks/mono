import { Stack, styled } from 'leather-styles/jsx';

import type { BondVaultLeaf } from '@leather.io/bitcoin';

interface BondVaultRequirement {
  vaultKind: BondVaultLeaf['kind'];
  vaultThreshold: number;
  vaultKeyExpressions: string[];
}

export interface BondSpendingConditionsDetails extends BondVaultRequirement {
  unlockHeight: number;
  hash: string;
  counterpartyKey: string;
}

export function formatVaultRequirement({
  vaultKind,
  vaultThreshold,
  vaultKeyExpressions,
}: BondVaultRequirement) {
  if (vaultKind === 'pk') return 'the owner key';
  return `${vaultThreshold} of ${vaultKeyExpressions.length} vault co-signers`;
}

interface BondKeyProps {
  label: string;
  value: string;
}
function BondKey({ label, value }: BondKeyProps) {
  return (
    <>
      <styled.span textStyle="caption.01" color="ink.text-secondary">
        {label}
      </styled.span>
      <styled.code textStyle="caption.01" wordBreak="break-all">
        {value}
      </styled.code>
    </>
  );
}

interface BondSpendingConditionsProps {
  details: BondSpendingConditionsDetails;
}
export function BondSpendingConditions({ details }: BondSpendingConditionsProps) {
  const { unlockHeight, hash, counterpartyKey, vaultKind, vaultKeyExpressions } = details;
  const vaultRequirement = formatVaultRequirement(details);
  const ownerKey = vaultKind === 'pk' ? vaultKeyExpressions[0] : undefined;

  return (
    <Stack gap="space.04">
      <Stack gap="space.01">
        <styled.span textStyle="label.02">From block {unlockHeight}</styled.span>
        <styled.span textStyle="caption.01" color="ink.text-secondary">
          Requires {vaultRequirement}
        </styled.span>
        {ownerKey ? <BondKey label="Owner key" value={ownerKey} /> : null}
      </Stack>
      <Stack gap="space.01">
        <styled.span textStyle="label.02">Before block {unlockHeight}</styled.span>
        <styled.span textStyle="caption.01" color="ink.text-secondary">
          Requires {vaultRequirement}, plus a signature from the counterparty key and the secret
          matching the SHA-256 hash
        </styled.span>
        <BondKey label="Counterparty key" value={counterpartyKey} />
        <BondKey label="SHA-256 hash" value={hash} />
      </Stack>
    </Stack>
  );
}
