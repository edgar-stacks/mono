import { Flex, styled } from 'leather-styles/jsx';

import { CheckmarkIcon } from '@leather.io/ui';

import type { JourneyVaultStep } from '../journeys/journey-definitions';
import type { JourneyAccount } from '../journeys/journey-world';

type SignerStatus = 'signed' | 'waiting' | 'not-signed';

const yourName = 'You';

function getSignerStatus(signer: string, index: number, step: JourneyVaultStep): SignerStatus {
  if (signer === yourName) return step === 'broadcast' ? 'signed' : 'waiting';
  if (index === 1 && step !== 'propose') return 'signed';
  return 'not-signed';
}

const statusLabels: Record<Exclude<SignerStatus, 'signed'>, string> = {
  waiting: 'Waiting for you',
  'not-signed': 'Not signed',
};

interface ApprovalSignersProps {
  vault: JourneyAccount;
  step: JourneyVaultStep;
}

export function ApprovalSigners({ vault, step }: ApprovalSignersProps) {
  const signers = vault.signers ?? [];
  const threshold = vault.threshold ?? signers.length;
  const statuses = signers.map((signer, index) => ({
    signer,
    status: getSignerStatus(signer, index, step),
  }));
  const collected = statuses.filter(entry => entry.status === 'signed').length;

  return (
    <Flex direction="column" gap="space.02" data-signers={`${collected}/${threshold}`}>
      <Flex justifyContent="space-between">
        <styled.span textStyle="label.03" color="ink.text-primary">
          Signatures
        </styled.span>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {collected} of {threshold} collected
        </styled.span>
      </Flex>
      {statuses.map(({ signer, status }) => (
        <Flex key={signer} alignItems="center" justifyContent="space-between">
          <styled.span textStyle="caption.01" color="ink.text-primary">
            {signer}
          </styled.span>
          {status === 'signed' ? (
            <CheckmarkIcon variant="small" color="green.action-primary-default" />
          ) : (
            <styled.span textStyle="caption.02" color="ink.text-subdued">
              {statusLabels[status]}
            </styled.span>
          )}
        </Flex>
      ))}
    </Flex>
  );
}
