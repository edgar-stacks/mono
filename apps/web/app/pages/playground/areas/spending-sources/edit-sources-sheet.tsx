import { useState } from 'react';

import { Box, Flex, Stack, styled } from 'leather-styles/jsx';

import { BasicTooltip, Button, Callout, InfoCircleIcon, SheetHeader, Switch } from '@leather.io/ui';

import { AddressTypeBadge } from './address-type-badge';
import { addressTypeDetails, formatBtc, sumCoins } from './spending-sources-format';
import type { SpendingSourcesScenario } from './spending-sources-mock-data';
import {
  type SpendingSource,
  type SpendingSourceType,
  isRequiredToCover,
  planSpend,
} from './spending-sources.utils';

const collectiblesTooltip =
  'Inscriptions and runes live on individual coins. If one of those coins is spent, its inscription or rune goes with it and cannot be recovered.';

interface SourceRowProps {
  source: SpendingSource;
  isChecked: boolean;
  isRequired: boolean;
  onToggle(type: SpendingSourceType): void;
}

function SourceRow({ source, isChecked, isRequired, onToggle }: SourceRowProps) {
  const { label } = addressTypeDetails[source.type];
  const switchId = `spending-source-${source.type}`;

  return (
    <Flex alignItems="center" gap="space.03" py="space.03">
      <AddressTypeBadge type={source.type} />
      <Stack gap="space.00" flex={1} minWidth={0}>
        <styled.label htmlFor={switchId} textStyle="label.02">
          {label}
        </styled.label>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {formatBtc(sumCoins(source.coins))} available · {source.coins.length} coins
        </styled.span>
        {source.mayHoldCollectibles && (
          <BasicTooltip label={collectiblesTooltip} side="top" asChild>
            <styled.span
              tabIndex={0}
              width="fit-content"
              display="inline-flex"
              alignItems="center"
              gap="space.01"
              textStyle="caption.01"
              color="ink.text-subdued"
            >
              May hold inscriptions or runes
              <InfoCircleIcon variant="small" />
            </styled.span>
          </BasicTooltip>
        )}
        {isRequired && (
          <styled.span textStyle="caption.01" color="ink.text-primary">
            Needed to cover this transfer
          </styled.span>
        )}
      </Stack>
      <Switch.Root
        id={switchId}
        checked={isChecked}
        disabled={isRequired}
        onCheckedChange={() => onToggle(source.type)}
      >
        <Switch.Thumb />
      </Switch.Root>
    </Flex>
  );
}

interface EditSourcesSheetProps {
  scenario: SpendingSourcesScenario;
  initialAllowed: SpendingSourceType[];
  onApply(allowed: SpendingSourceType[]): void;
  onCancel(): void;
}

export function EditSourcesSheet({
  scenario,
  initialAllowed,
  onApply,
  onCancel,
}: EditSourcesSheetProps) {
  const { sources, amountSats } = scenario;
  const requiredTypes = sources
    .map(source => source.type)
    .filter(type => isRequiredToCover({ sources, type, amountSats }));
  const [draftAllowed, setDraftAllowed] = useState(() =>
    Array.from(new Set([...initialAllowed, ...requiredTypes]))
  );
  const plan = planSpend({ sources, allowed: draftAllowed, amountSats });
  const isTaprootRequired = requiredTypes.includes('taproot');

  function toggle(type: SpendingSourceType) {
    setDraftAllowed(current =>
      current.includes(type) ? current.filter(allowed => allowed !== type) : [...current, type]
    );
  }

  return (
    <Box position="absolute" inset={0} zIndex={10} display="flex" flexDirection="column">
      <Box
        position="absolute"
        inset={0}
        bg="overlay"
        animation="fadein 150ms cubic-bezier(0.16, 1, 0.3, 1)"
        onClick={onCancel}
      />
      <Stack
        role="dialog"
        aria-label="Edit sources"
        position="relative"
        mt="auto"
        gap="space.00"
        bg="ink.background-primary"
        borderTopRadius="lg"
        animation="sheetRiseIn 300ms"
      >
        <SheetHeader title="Edit sources" onClose={onCancel} />
        <Stack gap="space.03" px="space.05">
          {isTaprootRequired && (
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
                isChecked={draftAllowed.includes(source.type)}
                isRequired={requiredTypes.includes(source.type)}
                onToggle={toggle}
              />
            ))}
          </Stack>
          <Flex
            justifyContent="space-between"
            borderTop="default"
            pt="space.03"
            textStyle="caption.01"
            color="ink.text-subdued"
          >
            <styled.span>{formatBtc(plan.selectedSats)} selected</styled.span>
            <styled.span>Fee {formatBtc(plan.feeSats)}</styled.span>
          </Flex>
        </Stack>
        <Flex gap="space.04" p="space.05">
          <Button variant="outline" flex={1} onClick={onCancel}>
            Cancel
          </Button>
          <Button flex={1} disabled={!plan.isCovered} onClick={() => onApply(draftAllowed)}>
            Apply
          </Button>
        </Flex>
      </Stack>
    </Box>
  );
}
