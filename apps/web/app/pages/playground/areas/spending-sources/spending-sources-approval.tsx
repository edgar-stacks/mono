import { useState } from 'react';

import { Box, Flex, HStack, Stack, styled } from 'leather-styles/jsx';
import { link } from 'leather-styles/recipes';

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
import { type SpendingScenario, mockAccount } from './spending-sources.mock-data';
import {
  type AddressType,
  formatBtc,
  getDefaultAllowed,
  planSpend,
} from './spending-sources.utils';

const popupWidth = '392px';
const popupHeight = '600px';

interface EditSourcesButtonProps {
  onClick(): void;
}

function EditSourcesButton({ onClick }: EditSourcesButtonProps) {
  return (
    <styled.button type="button" className={link({ size: 'sm' })} onClick={onClick}>
      Edit sources
    </styled.button>
  );
}

interface SpendingSourcesApprovalProps {
  scenario: SpendingScenario;
  initialAllowed?: AddressType[];
  isSheetOpenOnMount?: boolean;
}

export function SpendingSourcesApproval({
  scenario,
  initialAllowed,
  isSheetOpenOnMount = false,
}: SpendingSourcesApprovalProps) {
  const { sources, amountSats, requester, recipient } = scenario;
  const [allowed, setAllowed] = useState(
    () => initialAllowed ?? getDefaultAllowed(sources, amountSats)
  );
  const [isSheetOpen, setIsSheetOpen] = useState(isSheetOpenOnMount);

  const plan = planSpend({ sources, allowed, amountSats });
  const isTaprootSpent = plan.spentByType.taproot > 0;
  const spentSources = sources.filter(source => plan.spentByType[source.type] > 0);
  const totalBalanceSats = sources
    .flatMap(source => source.coins)
    .reduce((total, sats) => total + sats, 0);

  function openSheet() {
    setIsSheetOpen(true);
  }

  function applySources(nextAllowed: AddressType[]) {
    setAllowed(nextAllowed);
    setIsSheetOpen(false);
  }

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
      bg="ink.background-secondary"
      transform="translateZ(0)"
    >
      <Box height="100%" overflowY="auto">
        <Approver requester={requester} width="100%">
          <Box position="relative">
            <Approver.Header title="Send token" />
            {isTaprootSpent && (
              <Callout variant="warning" title="Some coins from a Taproot address">
                <EditSourcesButton onClick={openSheet} />
              </Callout>
            )}
            <Approver.Section>
              <Approver.Subheader>With account</Approver.Subheader>
              <Box mb="space.03">
                <ItemLayout
                  img={<Avatar fallback="A1" />}
                  titleLeft={mockAccount.name}
                  captionLeft={
                    isTaprootSpent
                      ? 'Multiple address types'
                      : truncateMiddle(mockAccount.nativeSegwitAddress, 4)
                  }
                  titleRight={formatBtc(totalBalanceSats)}
                  captionRight="Native SegWit + Taproot"
                />
              </Box>
            </Approver.Section>
            <Approver.Section>
              <Flex alignItems="center" justifyContent="space-between">
                <Approver.Subheader>You'll send</Approver.Subheader>
                <EditSourcesButton onClick={openSheet} />
              </Flex>
              <ItemLayout
                img={<BtcAvatarIcon />}
                titleLeft="Bitcoin"
                captionLeft="Bitcoin blockchain"
                titleRight={formatBtc(amountSats)}
                captionRight={`Fee ${formatBtc(plan.feeSats)}`}
              />
              {isTaprootSpent && (
                <Stack gap="space.02" mt="space.04">
                  {spentSources.map(source => (
                    <Flex key={source.type} alignItems="center" gap="space.03">
                      <AddressTypeBadge prefix={source.prefix} />
                      <styled.span textStyle="caption.01" flex={1}>
                        {source.label}
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
          </Box>
          <Approver.Actions
            actions={[
              <Button key="cancel" variant="outline">
                Cancel
              </Button>,
              <Button key="confirm">Confirm</Button>,
            ]}
          >
            <Flex justifyContent="space-between" mb="space.03" textStyle="label.02">
              <styled.span>Total spend</styled.span>
              <styled.span>{formatBtc(amountSats + plan.feeSats)}</styled.span>
            </Flex>
          </Approver.Actions>
        </Approver>
      </Box>
      {isSheetOpen && (
        <EditSourcesSheet
          sources={sources}
          allowed={allowed}
          amountSats={amountSats}
          onCancel={() => setIsSheetOpen(false)}
          onApply={applySources}
        />
      )}
    </Box>
  );
}
