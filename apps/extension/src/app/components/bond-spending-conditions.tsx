import { Stack, styled } from 'leather-styles/jsx';

export type BondVaultKind = 'pk' | 'multi';

export interface BondVaultRequirement {
  vaultKind: BondVaultKind;
  vaultThreshold: number;
  vaultKeyExpressions: string[];
}

export function formatVaultSigners({
  vaultKind,
  vaultThreshold,
  vaultKeyExpressions,
}: BondVaultRequirement) {
  if (vaultKind === 'pk') return 'the owner key';
  return `${vaultThreshold} of ${vaultKeyExpressions.length} vault co-signers`;
}

export function formatVaultRequirement(vault: BondVaultRequirement) {
  return `Requires ${formatVaultSigners(vault)}`;
}

export interface BondSpendingConditionsProps extends BondVaultRequirement {
  unlockHeight: number;
  hash: string;
  counterpartyKey: string;
}

function LabeledKey({ label, value }: { label: string; value: string }) {
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

export function BondSpendingConditions({
  unlockHeight,
  hash,
  counterpartyKey,
  vaultKind,
  vaultThreshold,
  vaultKeyExpressions,
}: BondSpendingConditionsProps) {
  const vaultRequirement = formatVaultRequirement({
    vaultKind,
    vaultThreshold,
    vaultKeyExpressions,
  });
  const ownerKey = vaultKind === 'pk' ? vaultKeyExpressions[0] : undefined;

  return (
    <Stack gap="space.04">
      <Stack gap="space.01">
        <styled.span textStyle="label.02">From block {unlockHeight}</styled.span>
        <styled.span textStyle="caption.01" color="ink.text-secondary">
          {vaultRequirement}
        </styled.span>
        {ownerKey ? <LabeledKey label="Owner key" value={ownerKey} /> : null}
      </Stack>
      <Stack gap="space.01">
        <styled.span textStyle="label.02">Before block {unlockHeight}</styled.span>
        <styled.span textStyle="caption.01" color="ink.text-secondary">
          {vaultRequirement}, plus a signature from the counterparty key and the secret matching the
          SHA-256 hash
        </styled.span>
        <LabeledKey label="Counterparty key" value={counterpartyKey} />
        <LabeledKey label="SHA-256 hash" value={hash} />
      </Stack>
    </Stack>
  );
}
