import type { PostConditionModeName } from '@stacks/transactions';
import { PostConditionSelectors } from '@tests/selectors/requests.selectors';
import { Box, styled } from 'leather-styles/jsx';

import { Avatar, Flag, LockIcon } from '@leather.io/ui';

const denyModeMessage =
  'Only fees will be transferred from your account or the transaction will abort.';
const originatorModeMessage =
  'Only fees will be transferred from your account. Contracts this transaction calls can still move their own assets.';

interface NoPostConditionsProps {
  mode: Exclude<PostConditionModeName, 'allow'>;
}
export function NoPostConditions({ mode }: NoPostConditionsProps) {
  return (
    <Flag width="100%" img={<Avatar icon={<LockIcon />} />}>
      <Box flexGrow={1}>
        <styled.span data-testid={PostConditionSelectors.NoPostConditions} textStyle="body.02">
          {mode === 'originator' ? originatorModeMessage : denyModeMessage}
        </styled.span>
      </Box>
    </Flag>
  );
}
