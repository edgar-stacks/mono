import { Stack, styled } from 'leather-styles/jsx';

export interface BondSpendingConditionsProps {
  unlockHeight: number;
  hash: string;
  counterpartyKey: string;
  vaultKind: 'pk' | 'multi';
  vaultThreshold: number;
  vaultKeyExpressions: string[];
}

type BondVaultSigners = Pick<
  BondSpendingConditionsProps,
  'vaultKind' | 'vaultThreshold' | 'vaultKeyExpressions'
>;

export function formatVaultSigners({
  vaultKind,
  vaultThreshold,
  vaultKeyExpressions,
}: BondVaultSigners) {
  if (vaultKind === 'pk') return 'the owner key';
  return `${vaultThreshold} of ${vaultKeyExpressions.length} vault co-signers`;
}

export function formatVaultRequirement(vaultSigners: BondVaultSigners) {
  return `Requires ${formatVaultSigners(vaultSigners)}`;
}

interface KeyValueProps {
  label: string;
  value: string;
}

function KeyValue({ label, value }: KeyValueProps) {
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
  const requirement = formatVaultRequirement({ vaultKind, vaultThreshold, vaultKeyExpressions });
  const [ownerKey] = vaultKeyExpressions;

  return (
    <Stack gap="space.04">
      <Stack gap="space.01">
        <styled.span textStyle="label.02">{`From block ${unlockHeight}`}</styled.span>
        <styled.span textStyle="caption.01" color="ink.text-secondary">
          {requirement}
        </styled.span>
        {vaultKind === 'pk' && ownerKey ? <KeyValue label="Owner key" value={ownerKey} /> : null}
      </Stack>
      <Stack gap="space.01">
        <styled.span textStyle="label.02">{`Before block ${unlockHeight}`}</styled.span>
        <styled.span textStyle="caption.01" color="ink.text-secondary">
          {`${requirement}, plus a signature from the counterparty key and the secret matching the SHA-256 hash`}
        </styled.span>
        <KeyValue label="Counterparty key" value={counterpartyKey} />
        <KeyValue label="SHA-256 hash" value={hash} />
      </Stack>
    </Stack>
  );
}
