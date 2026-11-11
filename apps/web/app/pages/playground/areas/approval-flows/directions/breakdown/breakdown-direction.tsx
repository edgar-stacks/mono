import { Flex, styled } from 'leather-styles/jsx';

import { RequesterIdentity } from '../../pattern/approval-identity';
import { ApprovalRow } from '../../pattern/approval-rows';
import { StandardRows } from '../../pattern/approval-standard-rows';
import { fiatValue, formatFiat } from '../../scenarios/approval-assets';
import type {
  DirectionHeaderProps,
  DirectionRowsProps,
  DirectionSectionProps,
} from '../direction-types';

export function BreakdownHeader({ request }: DirectionHeaderProps) {
  return (
    <Flex direction="column" gap="space.03">
      <RequesterIdentity requester={request.requester} />
      <styled.h1 textStyle="heading.05" color="ink.text-primary">
        {request.title}
      </styled.h1>
    </Flex>
  );
}

export function BreakdownRows({ request }: DirectionRowsProps) {
  const sent = request.movements
    .filter(movement => movement.direction === 'out')
    .reduce((total, movement) => total + fiatValue(movement.value), 0);
  const received = request.movements
    .filter(movement => movement.direction === 'in')
    .reduce((total, movement) => total + fiatValue(movement.value), 0);
  const fee = request.fee ? fiatValue(request.fee.value) : 0;
  return (
    <Flex direction="column">
      <StandardRows request={request} />
      {request.movements.length > 0 ? (
        <Flex
          direction="column"
          mt="space.02"
          pt="space.02"
          borderTopWidth="1px"
          borderTopStyle="dashed"
          borderColor="ink.border-default"
        >
          <ApprovalRow label="Value out" value={formatFiat(sent + fee)} />
          <ApprovalRow label="Value in" value={formatFiat(received)} />
          <ApprovalRow label="Net" value={formatFiat(received - sent - fee, { signed: true })} />
        </Flex>
      ) : null}
    </Flex>
  );
}

export function BreakdownSection({ title, children }: DirectionSectionProps) {
  return (
    <Flex direction="column" gap="space.01">
      <styled.span textStyle="label.02" color="ink.text-primary">
        {title}
      </styled.span>
      {children}
    </Flex>
  );
}
