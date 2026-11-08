import { PostConditionSelectors } from '@tests/selectors/requests.selectors';
import { styled } from 'leather-styles/jsx';

export function OriginatorPostConditionsNote() {
  return (
    <styled.span
      data-testid={PostConditionSelectors.OriginatorPostConditionsNote}
      color="ink.text-secondary"
      textStyle="caption.01"
    >
      Only your account is constrained. Contracts this transaction calls can still move their own
      assets.
    </styled.span>
  );
}
