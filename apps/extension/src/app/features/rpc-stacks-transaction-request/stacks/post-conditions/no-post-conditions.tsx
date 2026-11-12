import { Box, styled } from 'leather-styles/jsx';

import { Avatar, Flag, LockIcon } from '@leather.io/ui';

const noPostConditionsMessage = {
  deny: 'Nothing will leave your account, and every asset movement in this transaction must be listed below or it will abort.',
  originator:
    'Nothing will leave your account beyond fees. This contract may still move its own assets.',
} as const;

interface NoPostConditionsProps {
  postConditionMode: keyof typeof noPostConditionsMessage;
}
export function NoPostConditions({ postConditionMode }: NoPostConditionsProps) {
  return (
    <Flag width="100%" img={<Avatar icon={<LockIcon />} />}>
      <Box flexGrow={1}>
        <styled.span textStyle="body.02">{noPostConditionsMessage[postConditionMode]}</styled.span>
      </Box>
    </Flag>
  );
}
