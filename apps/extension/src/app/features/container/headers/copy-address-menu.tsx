import { HomePageSelectors } from '@tests/selectors/home.selectors';
import { css } from 'leather-styles/css';
import { Flex, HStack, Stack, styled } from 'leather-styles/jsx';

import { Badge, CopyIcon, DropdownMenu } from '@leather.io/ui';

import { analytics } from '@shared/utils/analytics';

import { copyToClipboard } from '@app/common/utils/copy-to-clipboard';
import { useToast } from '@app/features/toasts/use-toast';
import { useCurrentAccountAddresses } from '@app/services/accounts/use-account-addresses';

import { type CopyAddressOption, createCopyAddressOptions } from './copy-address-options';

const visibleAddressSuffixLength = 5;

const copyAddressItemIconStyles = css({
  flexShrink: 0,
  opacity: 0,
  '[data-highlighted] &': { opacity: 1 },
});

function trackCopyAddress({ id }: CopyAddressOption) {
  if (id === 'stx') {
    analytics.track('copy_stx_address_to_clipboard');
    return;
  }
  analytics.track('copy_btc_address_to_clipboard', {
    type: id === 'btc-taproot' ? 'btc-taproot' : 'btc',
  });
}

interface CopyAddressItemProps {
  option: CopyAddressOption;
  onCopy(option: CopyAddressOption): void;
}

function CopyAddressItem({ option, onCopy }: CopyAddressItemProps) {
  const testId = `${HomePageSelectors.CopyAddressOption}${option.id}`;
  const addressPrefix = option.address.slice(0, -visibleAddressSuffixLength);
  const addressSuffix = option.address.slice(-visibleAddressSuffixLength);

  return (
    <DropdownMenu.Item
      data-testid={testId}
      onSelect={() => onCopy(option)}
      wrapperClassName={css({ px: 'space.02', py: '0' })}
      className={css({ px: 'space.03', py: 'space.02', width: '100%' })}
    >
      <Flex alignItems="center" gap="space.03" justifyContent="space-between" width="100%">
        <Stack gap="space.01" minWidth="0">
          <HStack gap="space.02">
            <styled.span textStyle="label.02">{option.title}</styled.span>
            {option.badge && <Badge size="xs" label={option.badge} />}
          </HStack>
          <Flex
            color="ink.text-subdued"
            data-testid={`${testId}-address`}
            minWidth="0"
            textStyle="caption.01"
          >
            <styled.span overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
              {addressPrefix}
            </styled.span>
            <styled.span data-testid={`${testId}-address-suffix`} flexShrink={0}>
              {addressSuffix}
            </styled.span>
          </Flex>
        </Stack>
        <CopyIcon
          className={copyAddressItemIconStyles}
          data-testid={`${testId}-icon`}
          variant="small"
        />
      </Flex>
    </DropdownMenu.Item>
  );
}

export function CopyAddressMenu() {
  const toast = useToast();
  const accountAddresses = useCurrentAccountAddresses();
  const options = createCopyAddressOptions(accountAddresses);

  async function copyAddress(option: CopyAddressOption) {
    try {
      await copyToClipboard(option.address);
    } catch {
      toast.error('Failed to copy address');
      return;
    }
    trackCopyAddress(option);
    toast.success('Copied to clipboard!');
  }

  if (options.length === 0) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.IconButton
        aria-label="Copy address"
        data-testid={HomePageSelectors.CopyAddressMenuBtn}
      >
        <CopyIcon />
      </DropdownMenu.IconButton>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          side="bottom"
          sideOffset={8}
          className={css({
            width: '320px',
            maxWidth: 'calc(100vw - 32px)',
            boxShadow: 'elevation',
            pb: 'space.02',
          })}
        >
          <DropdownMenu.Label data-testid={HomePageSelectors.CopyAddressMenuTitle}>
            Copy account address
          </DropdownMenu.Label>
          {options.map(option => (
            <CopyAddressItem
              key={option.id}
              option={option}
              onCopy={selected => void copyAddress(selected)}
            />
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
