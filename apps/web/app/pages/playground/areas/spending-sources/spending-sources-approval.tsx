import { useState } from 'react';

import { Box, Flex, HStack, Stack, styled } from 'leather-styles/jsx';

import {
  AddressDisplayer,
  Approver,
  Avatar,
  BtcAvatarIcon,
  Button,
  Callout,
  Hr,
  ItemLayout,
  UserIcon,
} from '@leather.io/ui';
import { truncateMiddle } from '@leather.io/utils';

import { AddressTypeBadge } from './address-type-badge';
import { EditSourcesSheet } from './edit-sources-sheet';
import { addressTypeDetails, formatBtc, formatUsd, sumCoins } from './spending-sources-format';
import { type SpendingSourcesScenario, mockAccount } from './spending-sources-mock-data';
import { type SpendingSourceType, getDefaultAllowed, planSpend } from './spending-sources.utils';

const popupWidth = '390px';
const popupHeight = '600px';

interface PopupFrameProps {
  children: React.ReactNode;
}

function PopupFrame({ children }: PopupFrameProps) {
  return (
    <Box
      position="relative"
      width={popupWidth}
      height={popupHeight}
      flexShrink={0}
      overflow="hidden"
      borderWidth={1}
      borderColor="ink.border-default"
      borderRadius="md"
      bg="ink.background-primary"
      transform="translateZ(0)"
    >
      {children}
    </Box>
  );
}

interface SpendingSourcesApprovalProps {
  scenario: SpendingSourcesScenario;
  initialSheetAllowed?: SpendingSourceType[];
  isSheetOpenOnMount?: boolean;
}

export function SpendingSourcesApproval({
  scenario,
  initialSheetAllowed,
  isSheetOpenOnMount = false,
}: SpendingSourcesApprovalProps) {
  const { sources, amountSats, recipient, requester } = scenario;
  const [allowed, setAllowed] = useState(() => getDefaultAllowed({ sources, amountSats }));
  const [sheetAllowed, setSheetAllowed] = useState(
    isSheetOpenOnMount ? (initialSheetAllowed ?? allowed) : null
  );

  const plan = planSpend({ sources, allowed, amountSats });
  const spendsTaproot = plan.spentByType.taproot > 0;
  const balanceSats = sumCoins(sources.flatMap(source => source.coins));
  const totalSats = amountSats + plan.feeSats;

  function openSheet() {
    setSheetAllowed(allowed);
  }

  function closeSheet() {
    setSheetAllowed(null);
  }

  function applySheet(nextAllowed: SpendingSourceType[]) {
    setAllowed(nextAllowed);
    closeSheet();
  }

  return (
    <PopupFrame>
      <Box height="100%" overflowY="auto">
        <Approver requester={requester} width="100%">
          <Approver.Header title="Send token" />
          {spendsTaproot && (
            <Callout variant="warning" title="Some coins from a Taproot address">
              This BTC may carry inscriptions or runes. Spending it sends them along.
              <Button variant="outline" size="sm" display="flex" mt="space.03" onClick={openSheet}>
                Edit sources
              </Button>
            </Callout>
          )}
          <Approver.Section>
            <Approver.Subheader>With account</Approver.Subheader>
            <Box mb="space.03">
              <ItemLayout
                img={<Avatar size="lg" fallback="A1" />}
                titleLeft={mockAccount.name}
                captionLeft={
                  spendsTaproot
                    ? 'Multiple address types'
                    : truncateMiddle(mockAccount.nativeSegwitAddress, 4)
                }
                titleRight={formatBtc(balanceSats)}
                captionRight={formatUsd(balanceSats, mockAccount.btcPriceUsd)}
              />
            </Box>
          </Approver.Section>
          <Approver.Section>
            <Flex justifyContent="space-between" alignItems="center">
              <Approver.Subheader>You'll send</Approver.Subheader>
              <Button variant="ghost" size="sm" onClick={openSheet}>
                Edit sources
              </Button>
            </Flex>
            <ItemLayout
              img={<BtcAvatarIcon />}
              titleLeft="Bitcoin"
              captionLeft="Bitcoin blockchain"
              titleRight={formatBtc(amountSats)}
              captionRight={formatUsd(amountSats, mockAccount.btcPriceUsd)}
            />
            {spendsTaproot && (
              <Stack gap="space.02" mt="space.04">
                {sources.map(source => (
                  <Flex key={source.type} alignItems="center" gap="space.03">
                    <AddressTypeBadge type={source.type} />
                    <styled.span textStyle="caption.01" flex={1}>
                      From {addressTypeDetails[source.type].label}
                    </styled.span>
                    <styled.span textStyle="caption.01">
                      {formatBtc(plan.spentByType[source.type])}
                    </styled.span>
                  </Flex>
                ))}
              </Stack>
            )}
            <Hr mt="space.05" mb="space.04" />
            <Approver.Subheader>To address</Approver.Subheader>
            <HStack alignItems="center" gap="space.04" pb="space.03">
              <Avatar
                size="lg"
                bg="ink.component-background-hover"
                outlineColor="ink.component-background-hover"
                icon={<UserIcon />}
              />
              <AddressDisplayer address={recipient} />
            </HStack>
          </Approver.Section>
          <Approver.Actions
            actions={[
              <Button key="cancel" variant="outline">
                Cancel
              </Button>,
              <Button key="confirm">Confirm</Button>,
            ]}
          >
            <Stack gap="space.01" mb="space.04">
              <Flex justifyContent="space-between" textStyle="label.02">
                <styled.span>Total spend</styled.span>
                <styled.span>{formatBtc(totalSats)}</styled.span>
              </Flex>
              <Flex justifyContent="space-between" textStyle="caption.01" color="ink.text-subdued">
                <styled.span>Includes fee</styled.span>
                <styled.span>{formatBtc(plan.feeSats)}</styled.span>
              </Flex>
            </Stack>
          </Approver.Actions>
        </Approver>
      </Box>
      {sheetAllowed && (
        <EditSourcesSheet
          scenario={scenario}
          initialAllowed={sheetAllowed}
          onApply={applySheet}
          onCancel={closeSheet}
        />
      )}
    </PopupFrame>
  );
}
