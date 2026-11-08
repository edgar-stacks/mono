import { PostConditionSelectors } from '@tests/selectors/requests.selectors';
import { styled } from 'leather-styles/jsx';

export function OriginatorModeNote() {
  return (
    <styled.p
      data-testid={PostConditionSelectors.OriginatorModeNote}
      color="ink.text-secondary"
      textStyle="caption.01"
      mt="space.03"
    >
      Only your account is constrained. Contracts this transaction calls can still move their own
      assets.
    </styled.p>
  );
}
