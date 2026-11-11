import { useState } from 'react';

import { Box, Flex, HStack, Stack, styled } from 'leather-styles/jsx';
import { link as linkRecipe } from 'leather-styles/recipes';

import {
  AddressDisplayer,
  Approver,
  Avatar,
  BtcAvatarIcon,
  Button,
  Callout,
  Hr,
  ItemLayout,
  QuestionCircleIcon,
  UserIcon,
} from '@leather.io/ui';
import { truncateMiddle } from '@leather.io/utils';

import {
  AddressTypeBadge,
  addressTypeDetails,
  formatSats,
  formatSatsInUsd,
} from './address-type-badge';
import { EditSourcesSheet } from './edit-sources-sheet';
import { type SpendingScenario, mockAccount } from './spending-sources.mock-data';
import { type SpendingAddressType, getDefaultAllowed, planSpend } from './spending-sources.utils';

const popupWidth = '392px';
const popupHeight = '600px';

interface EditSourcesActionProps {
  onClick(): void;
}

function EditSourcesAction({ onClick }: EditSourcesActionProps) {
  return (
    <styled.button
      type="button"
      className={linkRecipe({ size: 'sm', variant: 'underlined' })}
      onClick={onClick}
    >
      Edit sources
    </styled.button>
  );
}

interface SpendingSourcesPreviewProps {
  scenario: SpendingScenario;
  initialAllowed?: SpendingAddressType[];
  isSheetOpenOnMount?: boolean;
}

export function SpendingSourcesPreview({
  scenario,
  initialAllowed,
  isSheetOpenOnMount = false,
}: SpendingSourcesPreviewProps) {
  const { sources, amountSats, recipient, requester } = scenario;
  const [allowed, setAllowed] = useState(
    () => initialAllowed ?? getDefaultAllowed({ sources, amountSats })
  );
  const [isSheetOpen, setIsSheetOpen] = useState(isSheetOpenOnMount);

  const plan = planSpend({ sources, allowed, amountSats });
  const spentSources = sources.filter(source => plan.spentByType[source.type] > 0);
  const isSpendingTaproot = plan.spentByType.taproot > 0;
  const isMultipleTypes = spentSources.length > 1;
  const availableSats = sources
    .flatMap(source => source.coinsSats)
    .reduce((total, sats) => total + sats, 0);
  const totalSats = amountSats + plan.feeSats;

  function openSheet() {
    setIsSheetOpen(true);
  }

  function applySources(nextAllowed: SpendingAddressType[]) {
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
          <Box>
            <Approver.Header
              title="Send token"
              info={
                <styled.span display="block" p="space.01">
                  <QuestionCircleIcon variant="small" />
                </styled.span>
              }
            />
            {isSpendingTaproot && (
              <Callout variant="warning" title="Some coins from a Taproot address">
                <Stack gap="space.02" alignItems="flex-start">
                  <styled.span>
                    These coins may carry inscriptions or runes, which are spent along with them.
                  </styled.span>
                  <EditSourcesAction onClick={openSheet} />
                </Stack>
              </Callout>
            )}
            <Approver.Section>
              <Approver.Subheader>With account</Approver.Subheader>
              <Box mb="space.03">
                <ItemLayout
                  img={<Avatar fallback="A1" size="lg" />}
                  titleLeft={mockAccount.name}
                  captionLeft={
                    isMultipleTypes
                      ? 'Multiple address types'
                      : truncateMiddle(mockAccount.nativeSegwitAddress, 4)
                  }
                  titleRight={formatSats(availableSats)}
                  captionRight={formatSatsInUsd(availableSats)}
                />
              </Box>
            </Approver.Section>
            <Approver.Section>
              <Flex alignItems="center" justifyContent="space-between">
                <Approver.Subheader>You'll send</Approver.Subheader>
                <EditSourcesAction onClick={openSheet} />
              </Flex>
              <ItemLayout
                img={<BtcAvatarIcon />}
                titleLeft="Bitcoin"
                captionLeft="Bitcoin blockchain"
                titleRight={formatSats(amountSats)}
                captionRight={formatSatsInUsd(amountSats)}
              />
              {isMultipleTypes && (
                <Stack gap="space.02" mt="space.04">
                  {spentSources.map(source => (
                    <Flex key={source.type} alignItems="center" justifyContent="space-between">
                      <HStack gap="space.02">
                        <AddressTypeBadge type={source.type} />
                        <styled.span textStyle="caption.01">
                          {addressTypeDetails[source.type].label}
                        </styled.span>
                      </HStack>
                      <styled.span textStyle="caption.01">
                        {formatSats(plan.spentByType[source.type])}
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
            <Flex justifyContent="space-between" textStyle="label.02" mb="space.03">
              <styled.span>Total spend</styled.span>
              <styled.span>{formatSats(totalSats)}</styled.span>
            </Flex>
          </Approver.Actions>
        </Approver>
      </Box>
      {isSheetOpen && (
        <EditSourcesSheet
          sources={sources}
          amountSats={amountSats}
          allowed={allowed}
          onApply={applySources}
          onCancel={() => setIsSheetOpen(false)}
        />
      )}
    </Box>
  );
}
