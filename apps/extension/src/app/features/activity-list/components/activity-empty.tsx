import NoActivityImage from '@assets/images/no-activity.png';
import { Stack } from 'leather-styles/jsx';

import { Caption } from '@leather.io/ui';

export function ActivityEmpty() {
  return (
    <Stack gap="space.06" justifyContent="center" alignItems="center">
      <img src={NoActivityImage} width="120px" />
      <Stack gap="space.01" alignItems="center">
        <Caption maxWidth="23ch" textAlign="center">
          No activity yet
        </Caption>
        <Caption maxWidth="40ch" textAlign="center">
          Transactions you send or receive will appear here.
        </Caption>
      </Stack>
    </Stack>
  );
}
