import { HomePageSelectors } from '@tests/selectors/home.selectors';
import { css } from 'leather-styles/css';
import { Flex, Stack, styled } from 'leather-styles/jsx';

import { Badge, CopyIcon, DropdownMenu } from '@leather.io/ui';

import { analytics } from '@shared/utils/analytics';

import { copyToClipboard } from '@app/common/utils/copy-to-clipboard';
import { useToast } from '@app/features/toasts/use-toast';
import { useCurrentAccountAddresses } from '@app/services/accounts/use-account-addresses';

import { type CopyAddressOption, createCopyAddressOptions } from './copy-address-options';

const visibleSuffixLength = 5;

function trackCopyAddress(option: CopyAddressOption) {
  if (option.id === 'stx') {
    analytics.track('copy_stx_address_to_clipboard');
    return;
  }
  analytics.track('copy_btc_address_to_clipboard', {
    type: option.id === 'btc-taproot' ? 'btc-taproot' : 'btc',
  });
}

interface CopyAddressRowProps {
  option: CopyAddressOption;
  onCopy(option: CopyAddressOption): void;
}
function CopyAddressRow({ option, onCopy }: CopyAddressRowProps) {
  const testId = `${HomePageSelectors.CopyAddressOption}${option.id}`;
  const prefix = option.address.slice(0, -visibleSuffixLength);
  const suffix = option.address.slice(-visibleSuffixLength);

  return (
    <DropdownMenu.Item
      data-testid={testId}
      onSelect={() => onCopy(option)}
      wrapperClassName={css({ px: 'space.02', py: 'space.01' })}
      className={css({ px: 'space.02', py: 'space.02', width: '100%' })}
    >
      <Flex alignItems="center" gap="space.03" minWidth="0" width="100%">
        <Stack flex="1" gap="0" minWidth="0">
          <Flex alignItems="center" gap="space.02">
            <styled.span textStyle="label.02">{option.title}</styled.span>
            {option.badge && <Badge size="xs" label={option.badge} />}
          </Flex>
          <Flex
            color="ink.text-subdued"
            data-testid={`${testId}-address`}
            minWidth="0"
            textStyle="caption.01"
          >
            <styled.span overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
              {prefix}
            </styled.span>
            <styled.span data-testid={`${testId}-address-suffix`} flexShrink="0">
              {suffix}
            </styled.span>
          </Flex>
        </Stack>
        <CopyIcon
          aria-hidden
          className={css({
            flexShrink: 0,
            opacity: 0,
            '[data-highlighted] &, [role=menuitem]:is(:hover, :focus-visible) &': { opacity: 1 },
          })}
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

  if (options.length === 0) return null;

  async function copyAddress(option: CopyAddressOption) {
    try {
      await copyToClipboard(option.address);
      trackCopyAddress(option);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy address');
    }
  }

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
            maxHeight: 'var(--radix-dropdown-menu-content-available-height)',
            overflowY: 'auto',
            boxShadow: 'elevation',
          })}
        >
          <DropdownMenu.Label data-testid={HomePageSelectors.CopyAddressMenuTitle}>
            Copy account address
          </DropdownMenu.Label>
          {options.map(option => (
            <CopyAddressRow
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
