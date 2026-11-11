import { Box, Flex, styled } from 'leather-styles/jsx';

import { RequesterIdentity } from '../../pattern/approval-identity';
import {
  ContractCallBlock,
  FeeRow,
  LimitsBlock,
  MessageBlock,
  SharesBlock,
} from '../../pattern/approval-rows';
import { MovementRows } from '../../pattern/approval-standard-rows';
import {
  demoAssets,
  fiatValue,
  formatAssetAmount,
  formatFiat,
} from '../../scenarios/approval-assets';
import type { ApprovalMovement } from '../../scenarios/approval-model';
import type {
  DirectionHeaderProps,
  DirectionRowsProps,
  DirectionSectionProps,
} from '../direction-types';

export function ActivityHeader({ request }: DirectionHeaderProps) {
  return (
    <Flex direction="column" gap="space.03">
      <styled.h1 textStyle="heading.05" color="ink.text-primary">
        {request.title}
      </styled.h1>
      <RequesterIdentity requester={request.requester} />
    </Flex>
  );
}

function ActivityMovement({ movement }: { movement: ApprovalMovement }) {
  const isOut = movement.direction === 'out';
  const signed = {
    ...movement.value,
    amount: isOut ? -movement.value.amount : movement.value.amount,
  };
  return (
    <Flex alignItems="center" gap="space.03" py="space.02">
      <Flex
        alignItems="center"
        justifyContent="center"
        width="36px"
        height="36px"
        borderRadius="round"
        bg="ink.component-background-default"
        textStyle="caption.02"
        color="ink.text-primary"
        flexShrink={0}
      >
        {movement.value.symbol.slice(0, 4)}
      </Flex>
      <Flex direction="column" flex="1" minWidth="0">
        <styled.span textStyle="label.02" color="ink.text-primary">
          {demoAssets[movement.value.symbol].name}
        </styled.span>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {isOut ? 'Sent' : 'Received'}
          {movement.estimated ? ' · estimated' : ''}
        </styled.span>
      </Flex>
      <Flex direction="column" alignItems="flex-end">
        <styled.span
          textStyle="label.02"
          color={isOut ? 'ink.text-primary' : 'green.action-primary-default'}
        >
          {formatAssetAmount(signed, { signed: true })}
        </styled.span>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {formatFiat(fiatValue(movement.value))}
        </styled.span>
      </Flex>
    </Flex>
  );
}

export function ActivityRows({ request }: DirectionRowsProps) {
  return (
    <Flex direction="column">
      {request.shares ? <SharesBlock shares={request.shares} /> : null}
      {request.message ? <MessageBlock message={request.message} /> : null}
      {request.movements.length > 0 ? (
        request.movements.map(movement => (
          <ActivityMovement
            key={`${movement.direction}-${movement.value.symbol}`}
            movement={movement}
          />
        ))
      ) : (
        <MovementRows request={request} />
      )}
      {request.contractCall ? <ContractCallBlock call={request.contractCall} /> : null}
      {request.limits ? <LimitsBlock limits={request.limits} /> : null}
      {request.fee ? <FeeRow fee={request.fee} /> : null}
    </Flex>
  );
}

export function ActivitySection({ title, children }: DirectionSectionProps) {
  return (
    <Box>
      <styled.span textStyle="label.03" color="ink.text-subdued">
        {title}
      </styled.span>
      {children}
    </Box>
  );
}
