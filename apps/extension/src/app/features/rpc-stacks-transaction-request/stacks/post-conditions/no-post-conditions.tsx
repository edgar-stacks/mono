import { PostConditionSelectors } from '@tests/selectors/requests.selectors';
import { Box, styled } from 'leather-styles/jsx';

import { Avatar, Flag, LockIcon } from '@leather.io/ui';

interface NoPostConditionsProps {
  isOriginatorMode?: boolean;
}
export function NoPostConditions({ isOriginatorMode = false }: NoPostConditionsProps) {
  return (
    <Flag width="100%" img={<Avatar icon={<LockIcon />} />}>
      <Box flexGrow={1}>
        <styled.span data-testid={PostConditionSelectors.NoPostConditions} textStyle="body.02">
          {isOriginatorMode
            ? 'Only fees will be transferred from your account. Contracts this transaction calls can still move their own assets.'
            : 'Only fees will be transferred from your account or the transaction will abort.'}
        </styled.span>
      </Box>
    </Flag>
  );
}
