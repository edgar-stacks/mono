import { Flex, styled } from 'leather-styles/jsx';

import { StandardRows } from '../../pattern/approval-standard-rows';
import { fiatValue, formatFiat } from '../../scenarios/approval-assets';
import type { ApprovalRequest } from '../../scenarios/approval-model';
import type { DirectionRowsProps } from '../direction-types';

function outgoingFiat(request: ApprovalRequest) {
  const spent = request.movements
    .filter(movement => movement.direction === 'out')
    .reduce((total, movement) => total + fiatValue(movement.value), 0);
  return spent + (request.fee ? fiatValue(request.fee.value) : 0);
}

export function HandshakeRows({ request }: DirectionRowsProps) {
  const showTotal = request.movements.some(movement => movement.direction === 'out');
  return (
    <Flex direction="column">
      <StandardRows request={request} />
      {showTotal ? (
        <Flex
          justifyContent="space-between"
          pt="space.02"
          mt="space.01"
          borderTopWidth="1px"
          borderTopStyle="solid"
          borderColor="ink.border-transparent"
        >
          <styled.span textStyle="label.03" color="ink.text-subdued">
            Total leaving {request.vault ? 'the vault' : 'your account'}
          </styled.span>
          <styled.span textStyle="label.02" color="ink.text-primary">
            {formatFiat(outgoingFiat(request))}
          </styled.span>
        </Flex>
      ) : null}
    </Flex>
  );
}
