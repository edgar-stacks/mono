import { Box } from 'leather-styles/jsx';

import { ItemLayoutWithButtons, Switch } from '@leather.io/ui';

const title = 'Move remaining STX to a fresh address';

interface SendAndRotateFieldProps {
  isEnabled: boolean;
  onChange(isEnabled: boolean): void;
}
export function SendAndRotateField({ isEnabled, onChange }: SendAndRotateFieldProps) {
  return (
    <Box width="100%" mt="space.04">
      <ItemLayoutWithButtons
        title={title}
        caption="Sends your other unlocked STX to a new account in a second transaction"
        buttons={
          <Switch.Root aria-label={title} checked={isEnabled} onCheckedChange={onChange}>
            <Switch.Thumb />
          </Switch.Root>
        }
      />
    </Box>
  );
}
