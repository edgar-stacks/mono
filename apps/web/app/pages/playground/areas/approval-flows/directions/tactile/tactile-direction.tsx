import { Flex, styled } from 'leather-styles/jsx';

import { RequesterMark } from '../../pattern/approval-identity';
import { StandardRows } from '../../pattern/approval-standard-rows';
import type {
  DirectionHeaderProps,
  DirectionRowsProps,
  DirectionSectionProps,
} from '../direction-types';

export function TactileHeader({ request }: DirectionHeaderProps) {
  return (
    <Flex
      alignItems="center"
      gap="space.03"
      p="space.04"
      borderRadius="lg"
      bg="ink.background-secondary"
      boxShadow="inset 0 -3px 0 rgba(0, 0, 0, 0.08)"
    >
      <RequesterMark requester={request.requester} size={48} />
      <Flex direction="column" minWidth="0">
        <styled.h1 textStyle="heading.05" color="ink.text-primary">
          {request.title}
        </styled.h1>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {request.requester.origin}
        </styled.span>
      </Flex>
    </Flex>
  );
}

export function TactileRows({ request }: DirectionRowsProps) {
  return <StandardRows request={request} />;
}

export function TactileSection({ title, children }: DirectionSectionProps) {
  return (
    <Flex
      direction="column"
      gap="space.01"
      p="space.04"
      borderRadius="lg"
      bg="ink.background-primary"
      boxShadow="0 2px 0 rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.06)"
    >
      <styled.span textStyle="label.03" color="ink.text-subdued">
        {title}
      </styled.span>
      {children}
    </Flex>
  );
}
