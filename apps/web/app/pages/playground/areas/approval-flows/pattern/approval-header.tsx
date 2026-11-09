import { Flex, styled } from 'leather-styles/jsx';

import type { ApprovalDirection } from '../directions/direction-registry';
import { HandshakeHeader } from '../directions/handshake/handshake-header';
import type { JourneyRequest, JourneyRequester } from '../journeys/journey-definitions';
import { formatSignedAssetAmount, formatUsd, toUsd } from '../journeys/journey-world';
import { RequesterAvatar, RequesterLine } from './approval-identity';

interface ApprovalHeaderProps {
  direction: ApprovalDirection;
  requester: JourneyRequester;
  request: JourneyRequest;
  animate?: boolean;
}

export function ApprovalHeader({ direction, requester, request, animate }: ApprovalHeaderProps) {
  if (direction.header === 'handshake') {
    return <HandshakeHeader requester={requester} title={request.title} animate={animate} />;
  }

  const [leadMovement] = request.movements;
  if (direction.header === 'hero-amount' && leadMovement) {
    return (
      <Flex direction="column" alignItems="center" gap="space.02" textAlign="center">
        <RequesterLine requester={requester} />
        <styled.span textStyle="heading.03" color="ink.text-primary">
          {formatSignedAssetAmount(leadMovement)}
        </styled.span>
        <styled.span textStyle="body.02" color="ink.text-subdued">
          {formatUsd(Math.abs(toUsd(leadMovement.asset, leadMovement.amount)))} · {request.title}
        </styled.span>
      </Flex>
    );
  }

  return (
    <Flex alignItems="center" gap="space.03">
      <RequesterAvatar requester={requester} size={32} />
      <Flex direction="column" minWidth={0}>
        <styled.h2 textStyle="heading.05" color="ink.text-primary">
          {request.title}
        </styled.h2>
        <Flex>
          <RequesterLine requester={requester} />
        </Flex>
      </Flex>
    </Flex>
  );
}
