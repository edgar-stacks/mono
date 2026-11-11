import { Box, Flex, styled } from 'leather-styles/jsx';

import { RequesterMark } from '../../pattern/approval-identity';
import { StandardRows } from '../../pattern/approval-standard-rows';
import { fiatValue, formatAssetAmount, formatFiat } from '../../scenarios/approval-assets';
import type {
  DirectionHeaderProps,
  DirectionRowsProps,
  DirectionSectionProps,
} from '../direction-types';

export function PhantomHeader({ request }: DirectionHeaderProps) {
  const [primary] = request.movements;
  return (
    <Flex direction="column" alignItems="center" gap="space.03" textAlign="center">
      <RequesterMark requester={request.requester} size={56} />
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        {request.requester.origin}
      </styled.span>
      {primary ? (
        <Flex direction="column" gap="space.00">
          <styled.span textStyle="heading.03" color="ink.text-primary">
            {formatAssetAmount(primary.value)}
          </styled.span>
          <styled.span textStyle="body.02" color="ink.text-subdued">
            {formatFiat(fiatValue(primary.value))}
          </styled.span>
        </Flex>
      ) : (
        <styled.h1 textStyle="heading.04" color="ink.text-primary">
          {request.title}
        </styled.h1>
      )}
    </Flex>
  );
}

export function PhantomRows({ request }: DirectionRowsProps) {
  return <StandardRows request={request} />;
}

export function PhantomSection({ children }: DirectionSectionProps) {
  return (
    <Box px="space.03" py="space.02" borderRadius="md" bg="ink.background-secondary">
      {children}
    </Box>
  );
}
