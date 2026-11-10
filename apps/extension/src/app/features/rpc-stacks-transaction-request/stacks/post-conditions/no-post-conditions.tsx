import { PostConditionSelectors } from '@tests/selectors/requests.selectors';
import { Box, styled } from 'leather-styles/jsx';

import { Avatar, Flag, LockIcon } from '@leather.io/ui';

const noPostConditionsCopy = {
  deny: 'Only fees will be transferred from your account or the transaction will abort.',
  originator:
    'Only fees will be transferred from your account. Contracts this transaction calls can still move their own assets.',
};

interface NoPostConditionsProps {
  mode: keyof typeof noPostConditionsCopy;
}
export function NoPostConditions({ mode }: NoPostConditionsProps) {
  return (
    <Flag width="100%" img={<Avatar icon={<LockIcon />} />}>
      <Box flexGrow={1}>
        <styled.span
          data-testid={PostConditionSelectors.NoPostConditionsMessage}
          textStyle="body.02"
        >
          {noPostConditionsCopy[mode]}
        </styled.span>
      </Box>
    </Flag>
  );
}
