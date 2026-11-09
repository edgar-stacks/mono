import { useState } from 'react';

import { Box, Flex, Stack, styled } from 'leather-styles/jsx';

import { BasicTooltip, Button, Callout, InfoCircleIcon, LockIcon, Switch } from '@leather.io/ui';

import { AddressTypeBadge } from './address-type-badge';
import {
  type AddressType,
  type SpendingSource,
  formatBtc,
  isRequiredToCover,
  planSpend,
} from './spending-sources.utils';

const collectiblesTooltip =
  'Inscriptions and runes live on individual coins. If one of those coins is spent, its inscription or rune goes with it and cannot be recovered.';

function sumCoins(coins: number[]) {
  return coins.reduce((total, sats) => total + sats, 0);
}

interface SourceRowProps {
  source: SpendingSource;
  isChecked: boolean;
  isLocked: boolean;
  onCheckedChange(isChecked: boolean): void;
}

function SourceRow({ source, isChecked, isLocked, onCheckedChange }: SourceRowProps) {
  const switchId = `spending-source-${source.type}`;

  return (
    <Flex alignItems="flex-start" gap="space.03" py="space.02">
      <AddressTypeBadge prefix={source.prefix} />
      <Stack gap="space.01" flex={1} minWidth={0}>
        <styled.label htmlFor={switchId} textStyle="label.02">
          {source.label}
        </styled.label>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {formatBtc(sumCoins(source.coins))} available · {source.coins.length} coins
        </styled.span>
        {source.mayHoldCollectibles && (
          <Flex alignItems="center" gap="space.01">
            <styled.span textStyle="caption.01" color="ink.text-subdued">
              May hold inscriptions or runes
            </styled.span>
            <BasicTooltip label={collectiblesTooltip} side="top" asChild>
              <styled.button
                type="button"
                aria-label="About inscriptions and runes"
                display="inline-flex"
                color="ink.text-subdued"
              >
                <InfoCircleIcon variant="small" />
              </styled.button>
            </BasicTooltip>
          </Flex>
        )}
        {isLocked && (
          <Flex alignItems="center" gap="space.01">
            <LockIcon variant="small" />
            <styled.span textStyle="caption.01">Needed to cover this transfer</styled.span>
          </Flex>
        )}
      </Stack>
      <Switch.Root
        id={switchId}
        checked={isChecked}
        disabled={isLocked}
        onCheckedChange={onCheckedChange}
      >
        <Switch.Thumb />
      </Switch.Root>
    </Flex>
  );
}

interface EditSourcesSheetProps {
  sources: SpendingSource[];
  allowed: AddressType[];
  amountSats: number;
  onCancel(): void;
  onApply(allowed: AddressType[]): void;
}

export function EditSourcesSheet({
  sources,
  allowed,
  amountSats,
  onCancel,
  onApply,
}: EditSourcesSheetProps) {
  const allTypes = sources.map(source => source.type);
  const lockedTypes = allTypes.filter(type =>
    isRequiredToCover({ sources, allowed: allTypes, amountSats, type })
  );
  const [draft, setDraft] = useState(() =>
    allTypes.filter(type => allowed.includes(type) || lockedTypes.includes(type))
  );
  const plan = planSpend({ sources, allowed: draft, amountSats });
  const isTaprootLocked = lockedTypes.includes('taproot');

  function toggleType(type: AddressType, isChecked: boolean) {
    setDraft(allTypes.filter(t => (t === type ? isChecked : draft.includes(t))));
  }

  return (
    <Box position="absolute" inset={0} zIndex={10}>
      <Box
        position="absolute"
        inset={0}
        bg="ink.background-overlay"
        animation="fadein 150ms cubic-bezier(0.16, 1, 0.3, 1)"
        onClick={onCancel}
      />
      <Stack
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-sources-title"
        position="absolute"
        left={0}
        right={0}
        bottom={0}
        maxHeight="100%"
        overflowY="auto"
        gap="space.03"
        p="space.05"
        bg="ink.background-primary"
        borderTopRadius="md"
        animation="sheetRiseIn 300ms"
      >
        <Stack gap="space.01">
          <styled.h2 id="edit-sources-title" textStyle="heading.05">
            Edit sources
          </styled.h2>
          <styled.p textStyle="caption.01" color="ink.text-subdued">
            Choose which address types this transfer can spend from.
          </styled.p>
        </Stack>
        {isTaprootLocked && (
          <Callout variant="error" title="Taproot coins are needed">
            Native SegWit alone cannot cover this transfer. To keep your Taproot coins untouched, go
            back to the app and use a smaller amount.
          </Callout>
        )}
        <Stack gap={0}>
          {sources.map(source => (
            <SourceRow
              key={source.type}
              source={source}
              isChecked={draft.includes(source.type)}
              isLocked={lockedTypes.includes(source.type)}
              onCheckedChange={isChecked => toggleType(source.type, isChecked)}
            />
          ))}
        </Stack>
        <Flex
          justifyContent="space-between"
          borderTop="default"
          pt="space.03"
          textStyle="caption.01"
        >
          <styled.span>{formatBtc(plan.selectedSats)} selected</styled.span>
          <styled.span color="ink.text-subdued">Fee {formatBtc(plan.feeSats)}</styled.span>
        </Flex>
        <Flex gap="space.04">
          <Button flex={1} variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button flex={1} disabled={!plan.isCovered} onClick={() => onApply(draft)}>
            Apply
          </Button>
        </Flex>
      </Stack>
    </Box>
  );
}
