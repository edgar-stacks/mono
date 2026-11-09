import type { ReactNode } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import { AddressDisplayer } from '@leather.io/ui';

import type { ApprovalRowsStyle } from '../directions/direction-registry';
import type {
  JourneyLimitComparator,
  JourneyRequest,
  JourneySpendingLimit,
} from '../journeys/journey-definitions';
import {
  type JourneyMovement,
  formatAssetAmount,
  formatSignedAssetAmount,
  formatUsd,
  toUsd,
} from '../journeys/journey-world';

interface ApprovalRowProps {
  label: string;
  value: ReactNode;
  caption?: string;
  tone?: 'default' | 'positive' | 'negative';
}

export function ApprovalRow({ label, value, caption, tone = 'default' }: ApprovalRowProps) {
  return (
    <Flex justifyContent="space-between" alignItems="start" gap="space.03" py="space.02">
      <styled.span textStyle="caption.01" color="ink.text-subdued" flexShrink={0}>
        {label}
      </styled.span>
      <Flex direction="column" alignItems="end" minWidth={0} textAlign="right">
        <styled.span
          textStyle="label.03"
          color={tone === 'positive' ? 'green.action-primary-default' : 'ink.text-primary'}
        >
          {value}
        </styled.span>
        {caption ? (
          <styled.span textStyle="caption.02" color="ink.text-subdued">
            {caption}
          </styled.span>
        ) : null}
      </Flex>
    </Flex>
  );
}

interface ApprovalRowGroupProps {
  title: string;
  rowsStyle: ApprovalRowsStyle;
  children: ReactNode;
}

export function ApprovalRowGroup({ title, rowsStyle, children }: ApprovalRowGroupProps) {
  const isCard = rowsStyle === 'card';
  const isReceipt = rowsStyle === 'receipt';
  return (
    <Box
      px={isCard ? 'space.03' : 'space.00'}
      py={isCard ? 'space.02' : 'space.00'}
      borderRadius={isCard ? 'sm' : undefined}
      borderWidth={isCard ? '1px' : undefined}
      borderStyle={isReceipt ? 'dashed' : 'solid'}
      borderColor="ink.border-default"
      borderTopWidth={isReceipt ? '1px' : undefined}
      borderLeftWidth={isReceipt ? '0' : undefined}
      borderRightWidth={isReceipt ? '0' : undefined}
      borderBottomWidth={isReceipt ? '0' : undefined}
    >
      <styled.h4 textStyle="label.03" color="ink.text-primary" pt="space.02">
        {title}
      </styled.h4>
      {children}
    </Box>
  );
}

function hasExactLimit(request: JourneyRequest, movement: JourneyMovement) {
  return request.limits.some(
    limit =>
      limit.asset === movement.asset &&
      limit.comparator === 'exactly' &&
      limit.amount === Math.abs(movement.amount)
  );
}

function getMovementCaption(request: JourneyRequest, movement: JourneyMovement) {
  const fiat = formatUsd(Math.abs(toUsd(movement.asset, movement.amount)));
  if (hasExactLimit(request, movement)) return fiat;
  return `Estimated · ${fiat}`;
}

interface ApprovalMovementsProps {
  request: JourneyRequest;
  rowsStyle: ApprovalRowsStyle;
}

export function ApprovalMovements({ request, rowsStyle }: ApprovalMovementsProps) {
  if (request.movements.length === 0) return null;
  const spent = request.movements.filter(movement => movement.amount < 0);
  const received = request.movements.filter(movement => movement.amount > 0);
  const isProposal = request.mode === 'sign-only' && request.vaultStep !== undefined;
  return (
    <ApprovalRowGroup
      title={isProposal ? 'Proposed payment' : 'Balance changes'}
      rowsStyle={rowsStyle}
    >
      {spent.map(movement => (
        <ApprovalRow
          key={`spent-${movement.asset}`}
          label={isProposal ? 'Vault sends' : 'You send'}
          value={formatSignedAssetAmount(movement)}
          caption={getMovementCaption(request, movement)}
          tone="negative"
        />
      ))}
      {received.map(movement => (
        <ApprovalRow
          key={`received-${movement.asset}`}
          label="You receive"
          value={formatSignedAssetAmount(movement)}
          caption={getMovementCaption(request, movement)}
          tone="positive"
        />
      ))}
      {request.recipient ? (
        <Flex justifyContent="space-between" gap="space.03" py="space.02">
          <styled.span textStyle="caption.01" color="ink.text-subdued" flexShrink={0}>
            To
          </styled.span>
          <AddressDisplayer
            address={request.recipient}
            textStyle="caption.01"
            justifyContent="end"
            maxWidth="190px"
          />
        </Flex>
      ) : null}
    </ApprovalRowGroup>
  );
}

const comparatorLabels: Record<JourneyLimitComparator, string> = {
  exactly: 'Exactly',
  'at-most': 'At most',
  'at-least': 'At least',
};

function describeLimit(limit: JourneySpendingLimit) {
  const amount = formatAssetAmount(limit.asset, limit.amount);
  if (limit.comparator === 'at-least')
    return `${comparatorLabels[limit.comparator]} ${amount} back`;
  return `${comparatorLabels[limit.comparator]} ${amount} out`;
}

interface ApprovalLimitsProps {
  request: JourneyRequest;
  rowsStyle: ApprovalRowsStyle;
}

export function ApprovalLimits({ request, rowsStyle }: ApprovalLimitsProps) {
  if (request.limits.length === 0) return null;
  return (
    <ApprovalRowGroup title="Enforced limits" rowsStyle={rowsStyle}>
      {request.limits.map(limit => (
        <ApprovalRow
          key={`${limit.asset}-${limit.comparator}`}
          label="The network rejects anything but"
          value={describeLimit(limit)}
        />
      ))}
    </ApprovalRowGroup>
  );
}

interface ApprovalFeeProps {
  request: JourneyRequest;
  feePayerName: string;
}

export function ApprovalFee({ request, feePayerName }: ApprovalFeeProps) {
  if (!request.fee) return null;
  const fiat = formatUsd(toUsd(request.fee.asset, request.fee.amount));
  const caption =
    request.mode === 'sign-only'
      ? `${fiat} · charged only if broadcast`
      : `${fiat} · paid by ${feePayerName}`;
  return (
    <ApprovalRow
      label="Network fee"
      value={formatAssetAmount(request.fee.asset, request.fee.amount)}
      caption={caption}
    />
  );
}

interface ApprovalContractProps {
  request: JourneyRequest;
  rowsStyle: ApprovalRowsStyle;
}

export function ApprovalContract({ request, rowsStyle }: ApprovalContractProps) {
  if (!request.contract) return null;
  const [address, name] = request.contract.contractId.split('.');
  return (
    <ApprovalRowGroup title="Contract call" rowsStyle={rowsStyle}>
      <ApprovalRow label="Function" value={request.contract.functionName} />
      <ApprovalRow
        label="Contract"
        value={name ?? request.contract.contractId}
        caption={address ? `${address.slice(0, 5)}…${address.slice(-4)}` : undefined}
      />
      {request.contract.args.length > 0 ? (
        <styled.details pb="space.02">
          <styled.summary textStyle="caption.01" color="ink.text-subdued" cursor="pointer">
            Arguments ({request.contract.args.length})
          </styled.summary>
          {request.contract.args.map(arg => (
            <ApprovalRow key={arg.name} label={arg.name} value={arg.value} />
          ))}
        </styled.details>
      ) : null}
    </ApprovalRowGroup>
  );
}

interface ApprovalMessageProps {
  request: JourneyRequest;
}

const messageFormatLabels = {
  utf8: 'Plain text',
  structured: 'Structured data (SIP-018)',
  bip322: 'Bitcoin message (BIP-322)',
} as const;

export function ApprovalMessage({ request }: ApprovalMessageProps) {
  if (!request.message) return null;
  return (
    <Flex direction="column" gap="space.02">
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        {messageFormatLabels[request.message.format]}
      </styled.span>
      <styled.pre
        textStyle="caption.01"
        whiteSpace="pre-wrap"
        wordBreak="break-word"
        p="space.03"
        borderRadius="sm"
        bg="ink.component-background-default"
        color="ink.text-primary"
        maxHeight="160px"
        overflowY="auto"
      >
        {request.message.content}
      </styled.pre>
    </Flex>
  );
}
