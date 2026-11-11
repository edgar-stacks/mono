import { Flex, styled } from 'leather-styles/jsx';

import { FirstVisitBadge, RequesterIdentity } from '../../pattern/approval-identity';
import {
  HandshakeAnimation,
  LeatherLaunchAnimation,
} from '../../pattern/approval-launch-animations';
import type { DirectionHeaderProps } from '../direction-types';

export function HandshakeHeader({ request, interactive, replayKey }: DirectionHeaderProps) {
  if (request.kind === 'connect') {
    return (
      <Flex direction="column" alignItems="center" gap="space.04" pt="space.03" textAlign="center">
        <HandshakeAnimation
          requester={request.requester}
          interactive={interactive}
          replayKey={replayKey}
        />
        <Flex direction="column" gap="space.01">
          <styled.h1 textStyle="heading.05" color="ink.text-primary">
            {request.title}
          </styled.h1>
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            {request.requester.origin}
          </styled.span>
        </Flex>
        {request.requester.firstVisit ? <FirstVisitBadge /> : null}
      </Flex>
    );
  }
  return (
    <Flex direction="column" gap="space.04">
      <Flex alignItems="center" gap="space.03">
        <LeatherLaunchAnimation interactive={interactive} replayKey={replayKey} size={32} />
        <styled.h1 textStyle="heading.05" color="ink.text-primary">
          {request.title}
        </styled.h1>
      </Flex>
      <RequesterIdentity requester={request.requester} />
    </Flex>
  );
}
