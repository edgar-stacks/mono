import { useState } from 'react';

import { Box, Flex, Stack, styled } from 'leather-styles/jsx';

import { BasicTooltip, Button, Callout, InfoCircleIcon, Switch } from '@leather.io/ui';

import { AddressTypeBadge, addressTypeDetails, formatSats } from './address-type-badge';
import {
  type SpendingAddressType,
  type SpendingSource,
  isRequiredToCover,
  planSpend,
} from './spending-sources.utils';

const collectiblesTooltip =
  'Inscriptions and runes live on individual coins. If one of those coins is spent, its inscription or rune goes with it and cannot be recovered.';

function formatCoinCount(count: number) {
  return count === 1 ? '1 coin' : `${count} coins`;
}

function sumSats(coinsSats: number[]) {
  return coinsSats.reduce((total, sats) => total + sats, 0);
}

interface SourceRowProps {
  source: SpendingSource;
  isChecked: boolean;
  isRequired: boolean;
  onCheckedChange(isChecked: boolean): void;
}

function SourceRow({ source, isChecked, isRequired, onCheckedChange }: SourceRowProps) {
  const { label } = addressTypeDetails[source.type];

  return (
    <Flex alignItems="center" justifyContent="space-between" gap="space.03" py="space.03">
      <Stack gap="space.01" minWidth={0}>
        <Flex alignItems="center" gap="space.02">
          <AddressTypeBadge type={source.type} />
          <styled.span textStyle="label.02">{label}</styled.span>
        </Flex>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {formatSats(sumSats(source.coinsSats))} available ·{' '}
          {formatCoinCount(source.coinsSats.length)}
        </styled.span>
        {source.mayHoldCollectibles && (
          <Flex alignItems="center" gap="space.01">
            <styled.span textStyle="caption.01" color="ink.text-subdued">
              May hold inscriptions or runes
            </styled.span>
            <BasicTooltip asChild label={collectiblesTooltip}>
              <styled.button type="button" display="flex" aria-label="About inscriptions and runes">
                <InfoCircleIcon variant="small" color="ink.text-subdued" />
              </styled.button>
            </BasicTooltip>
          </Flex>
        )}
        {isRequired && (
          <styled.span textStyle="caption.01" color="ink.text-primary">
            Needed to cover this transfer
          </styled.span>
        )}
      </Stack>
      <Switch.Root
        checked={isChecked}
        disabled={isRequired}
        onCheckedChange={onCheckedChange}
        aria-label={`Spend from ${label}`}
      >
        <Switch.Thumb />
      </Switch.Root>
    </Flex>
  );
}

interface EditSourcesSheetProps {
  sources: SpendingSource[];
  amountSats: number;
  initialAllowed: SpendingAddressType[];
  onCancel(): void;
  onApply(allowed: SpendingAddressType[]): void;
}

export function EditSourcesSheet({
  sources,
  amountSats,
  initialAllowed,
  onCancel,
  onApply,
}: EditSourcesSheetProps) {
  const [draftAllowed, setDraftAllowed] = useState(initialAllowed);

  const requiredTypes = sources
    .map(source => source.type)
    .filter(type => isRequiredToCover({ sources, type, amountSats }));
  const allowed = sources
    .map(source => source.type)
    .filter(type => draftAllowed.includes(type) || requiredTypes.includes(type));
  const plan = planSpend({ sources, allowed, amountSats });

  function toggleType(type: SpendingAddressType, isChecked: boolean) {
    setDraftAllowed(current =>
      isChecked ? [...current, type] : current.filter(currentType => currentType !== type)
    );
  }

  return (
    <Box position="absolute" inset={0} zIndex={1} display="flex" flexDirection="column">
      <Box
        flex={1}
        bg="rgba(0, 0, 0, 0.4)"
        animation="fadein 150ms cubic-bezier(0.16, 1, 0.3, 1)"
        onClick={onCancel}
      />
      <Stack
        role="dialog"
        aria-label="Edit sources"
        gap="space.04"
        px="space.05"
        pt="space.05"
        pb="space.05"
        bg="ink.background-primary"
        borderTopRadius="md"
        animation="sheetRiseIn 150ms"
      >
        <Stack gap="space.01">
          <styled.h2 textStyle="heading.05">Edit sources</styled.h2>
          <styled.p textStyle="caption.01" color="ink.text-subdued">
            Choose which address types this transfer may spend from.
          </styled.p>
        </Stack>
        {requiredTypes.includes('taproot') && (
          <Callout variant="error" title="Taproot coins are needed">
            Native SegWit alone cannot cover this transfer. To keep your Taproot coins untouched, go
            back to the app and use a smaller amount.
          </Callout>
        )}
        <Stack gap="space.00">
          {sources.map(source => (
            <SourceRow
              key={source.type}
              source={source}
              isChecked={allowed.includes(source.type)}
              isRequired={requiredTypes.includes(source.type)}
              onCheckedChange={isChecked => toggleType(source.type, isChecked)}
            />
          ))}
        </Stack>
        <Flex justifyContent="space-between" gap="space.03">
          <styled.span textStyle="label.02">{formatSats(plan.selectedSats)} selected</styled.span>
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            Fee {formatSats(plan.feeSats)}
          </styled.span>
        </Flex>
        <Flex gap="space.04">
          <Button variant="outline" flex={1} onClick={onCancel}>
            Cancel
          </Button>
          <Button flex={1} disabled={!plan.isCovered} onClick={() => onApply(allowed)}>
            Apply
          </Button>
        </Flex>
      </Stack>
    </Box>
  );
}
