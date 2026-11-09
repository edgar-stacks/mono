import { SendCryptoAssetSelectors } from '@tests/selectors/send.selectors';
import { Flex, Stack, styled } from 'leather-styles/jsx';

import { Switch } from '@leather.io/ui';

const switchId = 'send-and-rotate';

interface SendAndRotateFieldProps {
  isEnabled: boolean;
  onChange(isEnabled: boolean): void;
}
export function SendAndRotateField({ isEnabled, onChange }: SendAndRotateFieldProps) {
  return (
    <Flex
      width="100%"
      mt="space.04"
      gap="space.03"
      alignItems="center"
      justifyContent="space-between"
    >
      <Stack gap="space.01">
        <styled.label htmlFor={switchId} textStyle="label.02">
          Move remaining STX to a fresh address
        </styled.label>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Sends your other unlocked STX to a new account in a second transaction
        </styled.span>
      </Stack>
      <Switch.Root
        id={switchId}
        type="button"
        checked={isEnabled}
        onCheckedChange={onChange}
        data-testid={SendCryptoAssetSelectors.SendAndRotateSwitch}
      >
        <Switch.Thumb />
      </Switch.Root>
    </Flex>
  );
}
