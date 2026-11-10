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
  QuestionCircleIcon,
  UserIcon,
} from '@leather.io/ui';
import { truncateMiddle } from '@leather.io/utils';

import { AddressTypeBadge, addressTypeDetails, formatSats } from './address-type-badge';
import { EditSourcesSheet } from './edit-sources-sheet';
import { type SpendingScenario, mockAccount } from './spending-sources.mock-data';
import {
  type SpendingAddressType,
  type SpendingSource,
  getDefaultAllowed,
  planSpend,
} from './spending-sources.utils';

const popupWidth = '392px';
const popupHeight = '600px';

function sumSourcesSats(sources: SpendingSource[]) {
  return sources.reduce(
    (total, source) => total + source.coinsSats.reduce((sum, sats) => sum + sats, 0),
    0
  );
}

interface AccountCaptionProps {
  spentTypes: SpendingAddressType[];
}

function AccountCaption({ spentTypes }: AccountCaptionProps) {
  const [spentType] = spentTypes;

  if (spentTypes.length !== 1 || !spentType) {
    return (
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        Multiple address types
      </styled.span>
    );
  }

  const address =
    spentType === 'taproot' ? mockAccount.taprootAddress : mockAccount.nativeSegwitAddress;

  return (
    <Flex alignItems="center" gap="space.01">
      <AddressTypeBadge type={spentType} />
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        {truncateMiddle(address, 4)}
      </styled.span>
    </Flex>
  );
}

interface SpendBreakdownProps {
  spentByType: Record<SpendingAddressType, number>;
  spentTypes: SpendingAddressType[];
}

function SpendBreakdown({ spentByType, spentTypes }: SpendBreakdownProps) {
  return (
    <Stack gap="space.02" mt="space.04">
      {spentTypes.map(type => (
        <Flex key={type} alignItems="center" justifyContent="space-between" gap="space.03">
          <Flex alignItems="center" gap="space.02">
            <AddressTypeBadge type={type} />
            <styled.span textStyle="caption.01">From {addressTypeDetails[type].label}</styled.span>
          </Flex>
          <styled.span textStyle="caption.01">{formatSats(spentByType[type])}</styled.span>
        </Flex>
      ))}
    </Stack>
  );
}

interface SpendingSourcesApprovalProps {
  scenario: SpendingScenario;
  openSheetOnMount?: boolean;
  sheetInitialAllowed?: SpendingAddressType[];
}

export function SpendingSourcesApproval({
  scenario,
  openSheetOnMount = false,
  sheetInitialAllowed,
}: SpendingSourcesApprovalProps) {
  const { sources, amountSats, requester, recipient } = scenario;
  const [allowed, setAllowed] = useState(() => getDefaultAllowed({ sources, amountSats }));
  const [isSheetOpen, setIsSheetOpen] = useState(openSheetOnMount);
  const [sheetAllowed, setSheetAllowed] = useState(sheetInitialAllowed);

  const plan = planSpend({ sources, allowed, amountSats });
  const spentTypes = sources.map(source => source.type).filter(type => plan.spentByType[type] > 0);
  const isSpendingTaproot = plan.spentByType.taproot > 0;

  function openSheet() {
    setSheetAllowed(undefined);
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
          <Approver.Header
            title="Send token"
            info={
              <styled.span display="block" p="space.01">
                <QuestionCircleIcon variant="small" />
              </styled.span>
            }
          />
          <Box>
            {isSpendingTaproot && (
              <Callout variant="warning" title="Some coins from a Taproot address">
                They may carry inscriptions or runes, and spending them sends those along.
                <styled.button
                  type="button"
                  display="block"
                  mt="space.02"
                  textStyle="label.03"
                  textDecoration="underline"
                  onClick={openSheet}
                >
                  Edit sources
                </styled.button>
              </Callout>
            )}
          </Box>
          <Approver.Section>
            <Approver.Subheader>With account</Approver.Subheader>
            <Box mb="space.03">
              <ItemLayout
                img={<Avatar size="lg" icon={<UserIcon />} />}
                titleLeft={mockAccount.name}
                captionLeft={<AccountCaption spentTypes={spentTypes} />}
                titleRight={
                  <styled.span textStyle="label.02">
                    {formatSats(sumSourcesSats(sources))}
                  </styled.span>
                }
              />
            </Box>
          </Approver.Section>
          <Approver.Section>
            <Flex alignItems="center" justifyContent="space-between">
              <Approver.Subheader>You'll send</Approver.Subheader>
              <Button variant="ghost" size="sm" onClick={openSheet}>
                Edit sources
              </Button>
            </Flex>
            <ItemLayout
              img={<BtcAvatarIcon />}
              titleLeft="Bitcoin"
              captionLeft="Bitcoin blockchain"
              titleRight={formatSats(amountSats)}
            />
            {isSpendingTaproot && (
              <SpendBreakdown spentByType={plan.spentByType} spentTypes={spentTypes} />
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
            <Stack gap="space.01" mb="space.03">
              <Flex justifyContent="space-between">
                <styled.span textStyle="label.02">Total spend</styled.span>
                <styled.span textStyle="label.02">
                  {formatSats(amountSats + plan.feeSats)}
                </styled.span>
              </Flex>
              <Flex justifyContent="space-between">
                <styled.span textStyle="caption.01" color="ink.text-subdued">
                  Fee
                </styled.span>
                <styled.span textStyle="caption.01" color="ink.text-subdued">
                  {formatSats(plan.feeSats)}
                </styled.span>
              </Flex>
            </Stack>
          </Approver.Actions>
        </Approver>
      </Box>
      {isSheetOpen && (
        <EditSourcesSheet
          sources={sources}
          amountSats={amountSats}
          initialAllowed={sheetAllowed ?? allowed}
          onCancel={() => setIsSheetOpen(false)}
          onApply={applySources}
        />
      )}
    </Box>
  );
}
