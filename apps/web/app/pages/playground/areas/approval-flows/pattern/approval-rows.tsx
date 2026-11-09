import type { ReactNode } from 'react';

import { Flex, styled } from 'leather-styles/jsx';

import { LockIcon } from '@leather.io/ui';

import { formatAssetAmount, formatUsd, toUsd } from '../scenarios/approval-assets';
import type {
  ApprovalDetail,
  ApprovalFee,
  ApprovalLimit,
  ApprovalMovement,
  ApprovalRequest,
} from '../scenarios/approval-scenario.types';

interface ApprovalSectionProps {
  title: string;
  children: ReactNode;
}

export function ApprovalSection({ title, children }: ApprovalSectionProps) {
  return (
    <Flex direction="column" gap="space.02">
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        {title}
      </styled.span>
      {children}
    </Flex>
  );
}

interface ApprovalRowProps {
  label: ReactNode;
  value: ReactNode;
  caption?: ReactNode;
}

function ApprovalRow({ label, value, caption }: ApprovalRowProps) {
  return (
    <Flex justifyContent="space-between" alignItems="flex-start" gap="space.04">
      <styled.span textStyle="label.03" color="ink.text-subdued" flexShrink={0}>
        {label}
      </styled.span>
      <Flex direction="column" alignItems="flex-end" minWidth={0} textAlign="right">
        <styled.span textStyle="label.02" color="ink.text-primary" wordBreak="break-all">
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

interface MovementRowsProps {
  movements: ApprovalMovement[];
}

export function MovementRows({ movements }: MovementRowsProps) {
  if (movements.length === 0) {
    return (
      <styled.span textStyle="body.02" color="ink.text-subdued">
        No estimated balance change
      </styled.span>
    );
  }
  return (
    <Flex direction="column" gap="space.02">
      {movements.map((movement, index) => (
        <ApprovalRow
          key={index}
          label={movement.direction === 'out' ? 'You send' : 'You receive'}
          value={formatAssetAmount(movement.amount)}
          caption={formatUsd(toUsd(movement.amount))}
        />
      ))}
    </Flex>
  );
}

interface FeeRowProps {
  fee: ApprovalFee;
}

export function FeeRow({ fee }: FeeRowProps) {
  return (
    <ApprovalRow
      label="Network fee"
      value={formatAssetAmount(fee.amount)}
      caption={`${formatUsd(toUsd(fee.amount))} · ${fee.label}`}
    />
  );
}

interface LimitRowsProps {
  limits: ApprovalLimit[];
}

export function LimitRows({ limits }: LimitRowsProps) {
  return (
    <Flex direction="column" gap="space.02">
      {limits.map(limit => (
        <Flex key={`${limit.label}-${limit.detail}`} gap="space.02" alignItems="flex-start">
          <LockIcon variant="small" color="green.action-primary-default" />
          <Flex direction="column">
            <styled.span textStyle="label.03" color="ink.text-primary">
              {limit.label}
            </styled.span>
            <styled.span textStyle="caption.01" color="ink.text-subdued">
              {limit.detail}
            </styled.span>
          </Flex>
        </Flex>
      ))}
    </Flex>
  );
}

interface DetailRowsProps {
  details: ApprovalDetail[];
}

export function DetailRows({ details }: DetailRowsProps) {
  return (
    <Flex direction="column" gap="space.02">
      {details.map(detail => (
        <ApprovalRow
          key={detail.label}
          label={detail.label}
          value={
            detail.mono ? (
              <styled.span textStyle="caption.01" fontFamily="mono">
                {detail.value}
              </styled.span>
            ) : (
              detail.value
            )
          }
        />
      ))}
    </Flex>
  );
}

interface MessageBlockProps {
  message: NonNullable<ApprovalRequest['message']>;
}

const messageFormatLabel = {
  plain: 'Plain text',
  structured: 'Structured data (SIP-018)',
  bip322: 'Bitcoin message (BIP-322)',
} as const;

export function MessageBlock({ message }: MessageBlockProps) {
  return (
    <Flex direction="column" gap="space.02">
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        {messageFormatLabel[message.format]}
      </styled.span>
      <styled.pre
        textStyle="caption.01"
        fontFamily="mono"
        whiteSpace="pre-wrap"
        wordBreak="break-word"
        p="space.03"
        borderRadius="sm"
        bg="ink.background-secondary"
        color="ink.text-primary"
        m={0}
      >
        {message.body}
      </styled.pre>
    </Flex>
  );
}

interface PermissionListProps {
  permissions: string[];
}

export function PermissionList({ permissions }: PermissionListProps) {
  return (
    <styled.ul display="flex" flexDirection="column" gap="space.02" pl="space.04" m={0}>
      {permissions.map(permission => (
        <styled.li key={permission} textStyle="body.02" color="ink.text-primary" listStyle="disc">
          {permission}
        </styled.li>
      ))}
    </styled.ul>
  );
}
