import { Box, Flex, styled } from 'leather-styles/jsx';

import { StandardRows } from '../../pattern/approval-standard-rows';
import type {
  DirectionHeaderProps,
  DirectionRowsProps,
  DirectionSectionProps,
} from '../direction-types';

export function BaselineHeader({ request }: DirectionHeaderProps) {
  return (
    <Flex direction="column" gap="space.01">
      <styled.h1 textStyle="heading.04" color="ink.text-primary">
        {request.title}
      </styled.h1>
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        Requested by {request.requester.origin}
      </styled.span>
    </Flex>
  );
}

export function BaselineRows({ request }: DirectionRowsProps) {
  return <StandardRows request={request} />;
}

export function BaselineSection({ children }: DirectionSectionProps) {
  return (
    <Box
      pb="space.03"
      borderBottomWidth="1px"
      borderBottomStyle="solid"
      borderColor="ink.border-transparent"
    >
      {children}
    </Box>
  );
}
