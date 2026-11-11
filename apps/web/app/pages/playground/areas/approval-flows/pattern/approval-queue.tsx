import { Flex, styled } from 'leather-styles/jsx';

interface ApprovalQueueProps {
  position: number;
  total: number;
}

export function ApprovalQueue({ position, total }: ApprovalQueueProps) {
  if (total <= 1) return null;
  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      px="space.03"
      py="space.02"
      borderRadius="sm"
      bg="ink.background-secondary"
    >
      <styled.span textStyle="caption.01" color="ink.text-primary">
        Request {position} of {total}
      </styled.span>
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        {total - position} waiting
      </styled.span>
    </Flex>
  );
}
