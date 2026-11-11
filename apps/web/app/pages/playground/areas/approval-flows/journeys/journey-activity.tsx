import { Flex, styled } from 'leather-styles/jsx';

import { truncateMiddle } from '@leather.io/utils';

import { ActivityRow, type ActivityRowIcon } from '../pattern/activity-row';
import { mappedActivities, summarizeActivityTrailing } from '../scenarios/activity-list-fixtures';
import { formatAssetAmount, formatFiat } from '../scenarios/approval-assets';
import type { ApprovalRequest } from '../scenarios/approval-model';
import type { JourneyRun, JourneyTransaction } from './journey-state';
import { feeChanges, movementChanges, portfolioEntries, portfolioUsdValue } from './journey-world';

export function activityIconFor(request: ApprovalRequest): ActivityRowIcon {
  const sends = request.movements.some(movement => movement.direction === 'out');
  const receives = request.movements.some(movement => movement.direction === 'in');
  if (request.contractCall && !(sends && receives)) return 'function';
  if (sends && receives) return 'swap';
  if (receives) return 'receive';
  if (sends) return 'send';
  return 'function';
}

function transactionChanges(transaction: JourneyTransaction, request: ApprovalRequest) {
  if (transaction.status === 'confirmed')
    return [...movementChanges(request), ...feeChanges(request)];
  if (transaction.status === 'failed' && transaction.feeCharged) return feeChanges(request);
  return [];
}

function transactionCaption(transaction: JourneyTransaction, request: ApprovalRequest) {
  const fee = request.fee ? formatAssetAmount(request.fee.value) : null;
  if (transaction.status === 'pending')
    return fee ? `Fee ${fee} is charged once it settles` : 'Waiting to confirm';
  if (transaction.status === 'failed')
    return transaction.feeCharged && fee ? `Failed · fee ${fee} charged` : 'Failed';
  return fee ? `Confirmed · fee ${fee}` : 'Confirmed';
}

interface JourneyActivityProps {
  run: JourneyRun;
  request: ApprovalRequest;
}

export function JourneyActivity({ run, request }: JourneyActivityProps) {
  const portfolio = request.vault ? run.portfolios.vault : run.portfolios.account;
  const transactions = [...run.transactions].reverse();
  const title = request.contractCall?.functionName ?? request.title;
  return (
    <Flex direction="column" height="100%" overflowY="auto">
      <Flex
        direction="column"
        gap="space.02"
        p="space.04"
        borderBottomWidth="1px"
        borderBottomStyle="solid"
        borderColor="ink.border-transparent"
      >
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {request.vault ? request.vault.name : 'Account balance'}
        </styled.span>
        <styled.span textStyle="heading.04" color="ink.text-primary">
          {formatFiat(portfolioUsdValue(portfolio))}
        </styled.span>
        <Flex gap="space.02" flexWrap="wrap">
          {portfolioEntries(portfolio).map(entry => (
            <styled.span key={entry.symbol} textStyle="caption.01" color="ink.text-subdued">
              {formatAssetAmount(entry)}
            </styled.span>
          ))}
        </Flex>
      </Flex>
      <Flex direction="column" p="space.02">
        <styled.h2 textStyle="label.02" color="ink.text-primary" px="space.03" pt="space.02">
          Activity
        </styled.h2>
        {transactions.length === 0 ? (
          <styled.span textStyle="caption.01" color="ink.text-subdued" px="space.03" py="space.02">
            Nothing from this session yet. Sign-only requests and messages never appear here.
          </styled.span>
        ) : null}
        {transactions.map(transaction => (
          <Flex key={transaction.txid} direction="column">
            <ActivityRow
              icon={activityIconFor(request)}
              title={title}
              subtitle={`${request.requester.name} · ${truncateMiddle(transaction.txid, 4)}`}
              status={transaction.status}
              trailing={summarizeActivityTrailing(
                transaction.status,
                transactionChanges(transaction, request)
              )}
            />
            <styled.span textStyle="caption.02" color="ink.text-subdued" px="space.03" pl="64px">
              {transactionCaption(transaction, request)}
            </styled.span>
          </Flex>
        ))}
        <styled.h2 textStyle="label.03" color="ink.text-subdued" px="space.03" pt="space.04">
          Earlier
        </styled.h2>
        {mappedActivities.map(row => (
          <ActivityRow
            key={row.id}
            icon={row.shape}
            title={row.title}
            subtitle={row.subtitle}
            status={row.status}
            trailing={summarizeActivityTrailing(row.status, row.changes)}
          />
        ))}
      </Flex>
    </Flex>
  );
}
