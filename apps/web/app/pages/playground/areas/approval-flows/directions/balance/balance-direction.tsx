import { Box, Flex, styled } from 'leather-styles/jsx';

import { createJourneyWorld } from '../../journeys/journey-world';
import { RequesterIdentity } from '../../pattern/approval-identity';
import { ApprovalRow } from '../../pattern/approval-rows';
import { StandardRows } from '../../pattern/approval-standard-rows';
import { formatAssetAmount } from '../../scenarios/approval-assets';
import type {
  DirectionHeaderProps,
  DirectionRowsProps,
  DirectionSectionProps,
} from '../direction-types';

export function BalanceHeader({ request }: DirectionHeaderProps) {
  return (
    <Flex direction="column" gap="space.03">
      <styled.h1 textStyle="heading.05" color="ink.text-primary">
        {request.title}
      </styled.h1>
      <RequesterIdentity requester={request.requester} />
    </Flex>
  );
}

export function BalanceRows({ request }: DirectionRowsProps) {
  const { portfolios } = createJourneyWorld(request.signer.kind);
  const portfolio = request.vault ? portfolios.vault : portfolios.account;
  return (
    <Flex direction="column">
      <StandardRows request={request} />
      {request.movements.map(movement => {
        const before = portfolio[movement.value.symbol] ?? 0;
        const delta = movement.direction === 'out' ? -movement.value.amount : movement.value.amount;
        const after = { symbol: movement.value.symbol, amount: before + delta };
        return (
          <ApprovalRow
            key={`balance-${movement.value.symbol}`}
            label={`${movement.value.symbol} balance after`}
            value={formatAssetAmount(after)}
            caption={`Now ${formatAssetAmount({ symbol: movement.value.symbol, amount: before })}`}
          />
        );
      })}
    </Flex>
  );
}

export function BalanceSection({ title, children }: DirectionSectionProps) {
  return (
    <Box p="space.03" borderRadius="sm" bg="ink.background-secondary">
      <styled.span textStyle="caption.02" color="ink.text-subdued">
        {title}
      </styled.span>
      {children}
    </Box>
  );
}
