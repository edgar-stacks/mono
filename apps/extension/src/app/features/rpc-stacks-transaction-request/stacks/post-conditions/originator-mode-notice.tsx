import { Callout } from '@leather.io/ui';

export function OriginatorModeNotice() {
  return (
    <Callout variant="info" mt="space.04" title="Only your account is protected">
      Post conditions apply only to your account in this transaction. Contracts and other addresses
      it calls may still move their own assets.
    </Callout>
  );
}
