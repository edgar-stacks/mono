import { PostConditionSelectors } from '@tests/selectors/requests.selectors';

import { Callout } from '@leather.io/ui';

export function PostConditionModeWarning() {
  return (
    <Callout
      data-testid={PostConditionSelectors.PostConditionModeWarning}
      variant="warning"
      mb="space.03"
      title="This transaction can transfer any of your assets"
    >
      If you confirm, you allow it to transfer any of your tokens. Only confirm if you trust and
      have verified the contract.
    </Callout>
  );
}
