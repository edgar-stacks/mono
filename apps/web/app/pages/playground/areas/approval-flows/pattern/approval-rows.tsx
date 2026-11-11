import type { ReactNode } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import { AddressDisplayer } from '@leather.io/ui';
import { truncateMiddle } from '@leather.io/utils';

import { fiatValue, formatAssetAmount, formatFiat } from '../scenarios/approval-assets';
import type {
  ApprovalContractCall,
  ApprovalFee,
  ApprovalLimits,
  ApprovalMessage,
  ApprovalMovement,
  ApprovalShare,
} from '../scenarios/approval-model';
import { shortAddress } from './approval-identity';

interface ApprovalRowProps {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
}

export function ApprovalRow({ label, value, caption }: ApprovalRowProps) {
  return (
    <Flex justifyContent="space-between" alignItems="flex-start" gap="space.03" py="space.02">
      <styled.span textStyle="label.03" color="ink.text-subdued" flexShrink={0}>
        {label}
      </styled.span>
      <Flex direction="column" alignItems="flex-end" minWidth="0" textAlign="right">
        <styled.span textStyle="label.02" color="ink.text-primary">
          {value}
        </styled.span>
        {caption ? (
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            {caption}
          </styled.span>
        ) : null}
      </Flex>
    </Flex>
  );
}

function movementLabel(movement: ApprovalMovement) {
  if (movement.direction === 'in') return movement.estimated ? 'You receive about' : 'You receive';
  return 'You send';
}

export function MovementRow({ movement }: { movement: ApprovalMovement }) {
  const sign = movement.direction === 'out' ? -1 : 1;
  const signed = { ...movement.value, amount: movement.value.amount * sign };
  return (
    <ApprovalRow
      label={movementLabel(movement)}
      value={formatAssetAmount(signed, { signed: true })}
      caption={
        movement.counterparty
          ? `${formatFiat(fiatValue(movement.value))} · to ${counterpartyLabel(movement.counterparty)}`
          : formatFiat(fiatValue(movement.value))
      }
    />
  );
}

function counterpartyLabel(counterparty: string) {
  return counterparty.includes(' ') ? counterparty : shortAddress(counterparty);
}

export function FeeRow({ fee }: { fee: ApprovalFee }) {
  const details = [
    formatFiat(fiatValue(fee.value)),
    fee.speed,
    fee.paidBy && `paid by ${fee.paidBy}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return <ApprovalRow label="Fee" value={formatAssetAmount(fee.value)} caption={details} />;
}

export function NoMovementRow() {
  return <ApprovalRow label="Balance change" value="None" caption="No tokens leave your account" />;
}

export function UnknownMovementRow() {
  return (
    <ApprovalRow
      label="Balance change"
      value="Not limited"
      caption="Leather cannot estimate what this call moves"
    />
  );
}

export function LimitsBlock({ limits }: { limits: ApprovalLimits }) {
  if (limits.mode === 'allow' || limits.rules.length === 0) {
    return (
      <Box py="space.02">
        <styled.span textStyle="label.03" color="red.action-primary-default">
          No spending limits
        </styled.span>
      </Box>
    );
  }
  return (
    <Flex direction="column" gap="space.01" py="space.02">
      <styled.span textStyle="label.03" color="ink.text-subdued">
        Enforced limits
      </styled.span>
      {limits.rules.map(rule => (
        <Flex key={rule} gap="space.02" alignItems="baseline">
          <styled.span textStyle="caption.01" color="green.action-primary-default" aria-hidden>
            ✓
          </styled.span>
          <styled.span textStyle="body.02" color="ink.text-primary">
            {rule}
          </styled.span>
        </Flex>
      ))}
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        If the call breaks a limit, it fails and only the fee is spent.
      </styled.span>
    </Flex>
  );
}

const messageFormatLabels: Record<ApprovalMessage['format'], string> = {
  utf8: 'Plain text',
  structured: 'Structured data (SIP-018)',
  bip322: 'Bitcoin message (BIP-322)',
};

export function MessageBlock({ message }: { message: ApprovalMessage }) {
  return (
    <Flex direction="column" gap="space.02" py="space.02">
      <Flex justifyContent="space-between" gap="space.02">
        <styled.span textStyle="label.03" color="ink.text-subdued">
          Message
        </styled.span>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {messageFormatLabels[message.format]}
        </styled.span>
      </Flex>
      {message.domain ? (
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Domain: {message.domain}
        </styled.span>
      ) : null}
      <styled.pre
        textStyle="code"
        whiteSpace="pre-wrap"
        wordBreak="break-word"
        p="space.03"
        borderRadius="sm"
        bg="ink.background-secondary"
        color="ink.text-primary"
        maxHeight="180px"
        overflowY="auto"
      >
        {message.content}
      </styled.pre>
    </Flex>
  );
}

export function ContractCallBlock({ call }: { call: ApprovalContractCall }) {
  return (
    <Flex direction="column" gap="space.01" py="space.02">
      <ApprovalRow
        label="Function"
        value={call.functionName}
        caption={truncateMiddle(call.contractId, 5)}
      />
      {call.args.map(arg => (
        <Flex key={arg.name} justifyContent="space-between" gap="space.03">
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            {arg.name}
          </styled.span>
          <styled.span textStyle="caption.01" color="ink.text-primary" textAlign="right">
            {arg.value}
          </styled.span>
        </Flex>
      ))}
    </Flex>
  );
}

export function SharesBlock({ shares }: { shares: ApprovalShare[] }) {
  return (
    <Flex direction="column" gap="space.02" py="space.02">
      <styled.span textStyle="label.03" color="ink.text-subdued">
        Shares
      </styled.span>
      {shares.map(share => (
        <Flex key={share.label} direction="column" gap="space.00">
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            {share.label}
          </styled.span>
          {share.address ? (
            <AddressDisplayer address={share.address} textStyle="caption.01" />
          ) : null}
        </Flex>
      ))}
    </Flex>
  );
}
