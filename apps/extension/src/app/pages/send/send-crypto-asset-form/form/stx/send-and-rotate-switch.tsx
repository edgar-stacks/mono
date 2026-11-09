import { SendCryptoAssetSelectors } from '@tests/selectors/send.selectors';
import { HStack, Stack, styled } from 'leather-styles/jsx';

import { Switch } from '@leather.io/ui';

const switchId = 'send-and-rotate-switch';

interface SendAndRotateSwitchProps {
  isChecked: boolean;
  onCheckedChange(isChecked: boolean): void;
}
export function SendAndRotateSwitch({ isChecked, onCheckedChange }: SendAndRotateSwitchProps) {
  return (
    <HStack width="100%" mt="space.04" justifyContent="space-between" gap="space.03">
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
        data-testid={SendCryptoAssetSelectors.SendAndRotateSwitch}
        type="button"
        checked={isChecked}
        onCheckedChange={onCheckedChange}
      >
        <Switch.Thumb />
      </Switch.Root>
    </HStack>
  );
}
