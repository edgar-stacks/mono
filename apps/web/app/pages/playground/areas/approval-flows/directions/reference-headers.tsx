import { Flex, styled } from 'leather-styles/jsx';

import { RequesterIdentity, RequesterMark } from '../pattern/approval-identity';
import { formatAssetAmount, formatUsd, toUsd } from '../scenarios/approval-assets';
import type { ApprovalRequest } from '../scenarios/approval-scenario.types';
import type { DirectionHeader } from './direction-registry';

interface ReferenceHeaderProps {
  header: Exclude<DirectionHeader, 'handshake'>;
  request: ApprovalRequest;
}

function TitleBlock({ request }: { request: ApprovalRequest }) {
  return (
    <Flex direction="column" gap="space.01">
      <styled.h1 textStyle="heading.05" color="ink.text-primary">
        {request.title}
      </styled.h1>
      <styled.p textStyle="body.02" color="ink.text-subdued">
        {request.subtitle}
      </styled.p>
    </Flex>
  );
}

function netUsd(request: ApprovalRequest) {
  return request.movements.reduce(
    (total, movement) => total + (movement.direction === 'in' ? 1 : -1) * toUsd(movement.amount),
    0
  );
}

export function ReferenceHeader({ header, request }: ReferenceHeaderProps) {
  switch (header) {
    case 'title':
      return (
        <Flex direction="column" gap="space.04">
          <RequesterIdentity requester={request.requester} />
          <TitleBlock request={request} />
        </Flex>
      );
    case 'activity':
      return (
        <Flex direction="column" gap="space.03">
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            Appears in Activity as
          </styled.span>
          <Flex
            alignItems="center"
            gap="space.03"
            p="space.03"
            borderRadius="sm"
            bg="ink.background-secondary"
          >
            <RequesterMark requester={request.requester} size={32} />
            <Flex direction="column" flex={1} minWidth={0}>
              <styled.span textStyle="label.02" color="ink.text-primary">
                {request.title}
              </styled.span>
              <styled.span textStyle="caption.01" color="ink.text-subdued">
                {request.requester.origin}
              </styled.span>
            </Flex>
            <styled.span textStyle="label.03" color="ink.text-primary">
              {request.movements.length > 0 ? formatUsd(netUsd(request), { signed: true }) : null}
            </styled.span>
          </Flex>
          <styled.p textStyle="body.02" color="ink.text-subdued">
            {request.subtitle}
          </styled.p>
        </Flex>
      );
    case 'balance':
      return (
        <Flex direction="column" gap="space.03">
          <RequesterIdentity requester={request.requester} />
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            Balance change
          </styled.span>
          <styled.span textStyle="heading.03" color="ink.text-primary">
            {request.movements.length > 0 ? formatUsd(netUsd(request), { signed: true }) : 'None'}
          </styled.span>
          <TitleBlock request={request} />
        </Flex>
      );
    case 'receipt':
      return (
        <Flex
          direction="column"
          gap="space.02"
          pb="space.03"
          borderBottomWidth="1px"
          borderBottomStyle="dashed"
          borderColor="ink.border-default"
        >
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            Receipt for {request.requester.name}
          </styled.span>
          <TitleBlock request={request} />
        </Flex>
      );
    case 'simulation':
      return (
        <Flex direction="column" gap="space.03">
          <RequesterIdentity requester={request.requester} />
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            If you approve
          </styled.span>
          {request.movements.length > 0 ? (
            request.movements.map((movement, index) => (
              <styled.span key={index} textStyle="heading.05" color="ink.text-primary">
                {formatAssetAmount(
                  {
                    ...movement.amount,
                    baseUnits:
                      movement.direction === 'in'
                        ? movement.amount.baseUnits
                        : -movement.amount.baseUnits,
                  },
                  { signed: true }
                )}
              </styled.span>
            ))
          ) : (
            <styled.span textStyle="heading.05" color="ink.text-primary">
              No predicted balance change
            </styled.span>
          )}
          <TitleBlock request={request} />
        </Flex>
      );
    default:
      return <TitleBlock request={request} />;
  }
}
