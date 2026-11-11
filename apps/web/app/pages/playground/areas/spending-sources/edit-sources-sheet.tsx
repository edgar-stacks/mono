import { useId, useState } from 'react';

import { Box, Flex, HStack, Stack, styled } from 'leather-styles/jsx';

import { BasicTooltip, Button, Callout, InfoCircleIcon, SheetHeader, Switch } from '@leather.io/ui';

import { AddressTypeBadge, addressTypeDetails, formatSats } from './address-type-badge';
import {
  type SpendingAddressType,
  type SpendingSource,
  isRequiredToCover,
  mayHoldCollectibles,
  planSpend,
} from './spending-sources.utils';

const sheetEasing = 'cubic-bezier(0.16, 1, 0.3, 1)';

const collectiblesTooltip =
  'Inscriptions and runes live on individual coins. If one of those coins is spent, its inscription or rune goes with it and cannot be recovered.';

interface SourceRowProps {
  source: SpendingSource;
  isChecked: boolean;
  isRequired: boolean;
  onCheckedChange(isChecked: boolean): void;
}

function SourceRow({ source, isChecked, isRequired, onCheckedChange }: SourceRowProps) {
  const { label } = addressTypeDetails[source.type];
  const availableSats = source.coinsSats.reduce((total, sats) => total + sats, 0);
  const coinCount = source.coinsSats.length;
  const switchId = useId();

  return (
    <Flex alignItems="center" justifyContent="space-between" gap="space.04" py="space.03">
      <Stack gap="space.01" minWidth={0}>
        <HStack gap="space.02">
          <AddressTypeBadge type={source.type} />
          <styled.label htmlFor={switchId} textStyle="label.02">
            {label}
          </styled.label>
        </HStack>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {formatSats(availableSats)} available · {coinCount} {coinCount === 1 ? 'coin' : 'coins'}
        </styled.span>
        {isRequired && (
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            Needed to cover this transfer
          </styled.span>
        )}
        {mayHoldCollectibles(source.type) && (
          <BasicTooltip label={collectiblesTooltip} side="top" asChild>
            <styled.button
              type="button"
              display="inline-flex"
              alignItems="center"
              gap="space.01"
              textStyle="caption.01"
              color="ink.text-subdued"
              width="fit-content"
            >
              May hold inscriptions or runes
              <InfoCircleIcon variant="small" />
            </styled.button>
          </BasicTooltip>
        )}
      </Stack>
      <Switch.Root
        id={switchId}
        checked={isChecked}
        disabled={isRequired}
        onCheckedChange={onCheckedChange}
      >
        <Switch.Thumb />
      </Switch.Root>
    </Flex>
  );
}

interface EditSourcesSheetProps {
  sources: SpendingSource[];
  amountSats: number;
  allowed: SpendingAddressType[];
  onApply(allowed: SpendingAddressType[]): void;
  onCancel(): void;
}

export function EditSourcesSheet({
  sources,
  amountSats,
  allowed,
  onApply,
  onCancel,
}: EditSourcesSheetProps) {
  const [draft, setDraft] = useState(allowed);

  const requiredTypes = sources
    .map(source => source.type)
    .filter(type => isRequiredToCover({ sources, type, amountSats }));
  const effectiveAllowed = sources
    .map(source => source.type)
    .filter(type => draft.includes(type) || requiredTypes.includes(type));
  const plan = planSpend({ sources, allowed: effectiveAllowed, amountSats });
  const isCollectibleTypeRequired = requiredTypes.some(mayHoldCollectibles);

  function toggle(type: SpendingAddressType, isChecked: boolean) {
    setDraft(current =>
      isChecked ? [...current, type] : current.filter(currentType => currentType !== type)
    );
  }

  return (
    <Box
      position="absolute"
      inset={0}
      zIndex={10}
      bg="overlay"
      display="flex"
      alignItems="flex-end"
      animation={`fadein 150ms ${sheetEasing}`}
      onClick={onCancel}
    >
      <Stack
        role="dialog"
        aria-label="Edit sources"
        width="100%"
        maxHeight="100%"
        overflowY="auto"
        bg="ink.background-primary"
        borderTopRadius="lg"
        animation={`sheetRiseIn 150ms ${sheetEasing}`}
        onClick={event => event.stopPropagation()}
      >
        <SheetHeader title="Edit sources" onClose={onCancel} />
        <Stack gap="space.04" px="space.05" pb="space.05">
          <styled.p textStyle="caption.01" color="ink.text-subdued">
            Choose which address types this transfer may spend from.
          </styled.p>
          {isCollectibleTypeRequired && (
            <Callout variant="error" title="Taproot coins are needed">
              Native SegWit alone cannot cover this transfer. To keep your Taproot coins untouched,
              go back to the app and use a smaller amount.
            </Callout>
          )}
          <Stack gap="space.00">
            {sources.map(source => (
              <SourceRow
                key={source.type}
                source={source}
                isChecked={effectiveAllowed.includes(source.type)}
                isRequired={requiredTypes.includes(source.type)}
                onCheckedChange={isChecked => toggle(source.type, isChecked)}
              />
            ))}
          </Stack>
          <Flex justifyContent="space-between" textStyle="caption.01" color="ink.text-subdued">
            <styled.span>{formatSats(plan.selectedSats)} selected</styled.span>
            <styled.span>Fee {formatSats(plan.feeSats)}</styled.span>
          </Flex>
          <Flex gap="space.04">
            <Button variant="outline" flex={1} onClick={onCancel}>
              Cancel
            </Button>
            <Button flex={1} disabled={!plan.isCovered} onClick={() => onApply(effectiveAllowed)}>
              Apply
            </Button>
          </Flex>
        </Stack>
      </Stack>
    </Box>
  );
}
