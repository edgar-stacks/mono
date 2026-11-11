import { Flex } from 'leather-styles/jsx';

import type { ApprovalRequest } from '../scenarios/approval-model';
import {
  ContractCallBlock,
  FeeRow,
  LimitsBlock,
  MessageBlock,
  MovementRow,
  NoMovementRow,
  SharesBlock,
  UnknownMovementRow,
} from './approval-rows';

function hasSpendingLimits(request: ApprovalRequest) {
  return request.limits?.mode === 'deny';
}

export function MovementRows({ request }: { request: ApprovalRequest }) {
  if (request.kind === 'connect' || request.kind === 'message') return null;
  if (request.movements.length > 0) {
    return (
      <>
        {request.movements.map(movement => (
          <MovementRow key={`${movement.direction}-${movement.value.symbol}`} movement={movement} />
        ))}
      </>
    );
  }
  if (request.limits && !hasSpendingLimits(request)) return <UnknownMovementRow />;
  return <NoMovementRow />;
}

export function StandardRows({ request }: { request: ApprovalRequest }) {
  return (
    <Flex direction="column">
      {request.shares ? <SharesBlock shares={request.shares} /> : null}
      {request.message ? <MessageBlock message={request.message} /> : null}
      <MovementRows request={request} />
      {request.contractCall ? <ContractCallBlock call={request.contractCall} /> : null}
      {request.limits ? <LimitsBlock limits={request.limits} /> : null}
      {request.fee ? <FeeRow fee={request.fee} /> : null}
    </Flex>
  );
}
