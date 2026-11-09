import { Box, Flex, styled } from 'leather-styles/jsx';

import { CheckmarkCircleIcon, LedgerIcon, WalletIcon } from '@leather.io/ui';

import type { ApprovalSigner } from '../scenarios/approval-scenario.types';

const signerStateLabel = {
  signed: 'Signed',
  you: 'Your signature',
  waiting: 'Not needed yet',
} as const;

interface ApprovalSignersProps {
  signers: ApprovalSigner[];
}

export function ApprovalSigners({ signers }: ApprovalSignersProps) {
  return (
    <Flex direction="column" gap="space.02">
      {signers.map(signer => (
        <Flex key={signer.label} alignItems="center" justifyContent="space-between" gap="space.03">
          <Flex alignItems="center" gap="space.02">
            <Box color="ink.text-primary">
              {signer.device === 'ledger' ? (
                <LedgerIcon variant="small" />
              ) : (
                <WalletIcon variant="small" />
              )}
            </Box>
            <styled.span
              textStyle="label.03"
              color={signer.state === 'you' ? 'ink.text-primary' : 'ink.text-subdued'}
            >
              {signer.label}
            </styled.span>
          </Flex>
          <Flex alignItems="center" gap="space.01">
            {signer.state === 'signed' ? (
              <CheckmarkCircleIcon variant="small" color="green.action-primary-default" />
            ) : null}
            <styled.span textStyle="caption.01" color="ink.text-subdued">
              {signerStateLabel[signer.state]}
            </styled.span>
          </Flex>
        </Flex>
      ))}
    </Flex>
  );
}

interface ApprovalQueueProps {
  position: number;
  total: number;
}

export function ApprovalQueue({ position, total }: ApprovalQueueProps) {
  return (
    <Flex alignItems="center" gap="space.02">
      <Flex gap="space.01" aria-hidden>
        {Array.from({ length: total }, (_, index) => (
          <Box
            key={index}
            width="6px"
            height="6px"
            borderRadius="round"
            bg={index + 1 === position ? 'ink.text-primary' : 'ink.border-default'}
          />
        ))}
      </Flex>
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        Request {position} of {total}
      </styled.span>
    </Flex>
  );
}
