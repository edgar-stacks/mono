import { Box, Flex, styled } from 'leather-styles/jsx';

import { StandardRows } from '../../pattern/approval-standard-rows';
import type {
  DirectionHeaderProps,
  DirectionRowsProps,
  DirectionSectionProps,
} from '../direction-types';

export function ReceiptHeader({ request }: DirectionHeaderProps) {
  return (
    <Flex direction="column" alignItems="center" gap="space.01" textAlign="center">
      <styled.span textStyle="caption.02" color="ink.text-subdued" fontFamily="mono">
        {request.requester.origin.toUpperCase()}
      </styled.span>
      <styled.h1 textStyle="heading.05" color="ink.text-primary">
        {request.title}
      </styled.h1>
      <styled.span textStyle="caption.02" color="ink.text-subdued" fontFamily="mono">
        {request.method}
      </styled.span>
    </Flex>
  );
}

export function ReceiptRows({ request }: DirectionRowsProps) {
  return (
    <Box fontFamily="mono">
      <StandardRows request={request} />
    </Box>
  );
}

export function ReceiptSection({ children }: DirectionSectionProps) {
  return (
    <Box
      py="space.02"
      borderTopWidth="1px"
      borderTopStyle="dashed"
      borderColor="ink.border-default"
    >
      {children}
    </Box>
  );
}
