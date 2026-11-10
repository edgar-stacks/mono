import { PostConditionSelectors } from '@tests/selectors/requests.selectors';
import { Box, styled } from 'leather-styles/jsx';

export function OriginatorModeNote() {
  return (
    <Box py="space.03">
      <styled.span
        data-testid={PostConditionSelectors.OriginatorModeNote}
        color="ink.text-secondary"
        textStyle="caption.01"
      >
        Only your account is constrained. Contracts this transaction calls can still move their own
        assets.
      </styled.span>
    </Box>
  );
}
