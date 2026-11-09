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

const copyAddressMenuContentStyles = css({
  width: '320px',
  maxWidth: 'calc(100vw - 32px)',
  boxShadow: 'elevation',
});

const copyAddressItemWrapperStyles = css({ px: 'space.02', py: 'space.01' });

const copyAddressItemStyles = css({
  width: '100%',
  px: 'space.03',
  py: 'space.02',
  '& [data-copy-icon]': { opacity: 0 },
  '&[data-highlighted] [data-copy-icon], &:focus-visible [data-copy-icon]': { opacity: 1 },
});

function trackCopyAddress(option: CopyAddressOption) {
  if (option.chain === 'stacks') {
    analytics.track('copy_stx_address_to_clipboard');
    return;
  }
  analytics.track('copy_btc_address_to_clipboard', {
    type: option.id === 'btc-taproot' ? 'btc-taproot' : 'btc',
  });
}

interface CopyAddressMenuItemProps {
  option: CopyAddressOption;
  onCopy(option: CopyAddressOption): void;
}
function CopyAddressMenuItem({ option, onCopy }: CopyAddressMenuItemProps) {
  const testId = `${HomePageSelectors.CopyAddressOption}${option.id}`;
  const addressPrefix = option.address.slice(0, -visibleAddressSuffixLength);
  const addressSuffix = option.address.slice(-visibleAddressSuffixLength);

  return (
    <DropdownMenu.Item
      className={copyAddressItemStyles}
      data-testid={testId}
      onSelect={() => onCopy(option)}
      wrapperClassName={copyAddressItemWrapperStyles}
    >
      <HStack gap="space.02" justifyContent="space-between" width="100%">
        <Stack gap="space.00" minWidth="0">
          <HStack gap="space.02">
            <styled.span textStyle="label.02">{option.title}</styled.span>
            {option.chain === 'bitcoin' && option.badge && <Badge label={option.badge} size="xs" />}
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
        <styled.span data-copy-icon="" data-testid={`${testId}-icon`} display="flex" flexShrink={0}>
          <CopyIcon variant="small" />
        </styled.span>
      </HStack>
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
          className={copyAddressMenuContentStyles}
          side="bottom"
          sideOffset={8}
        >
          <DropdownMenu.Label data-testid={HomePageSelectors.CopyAddressMenuTitle}>
            Copy account address
          </DropdownMenu.Label>
          {options.map(option => (
            <CopyAddressMenuItem
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
