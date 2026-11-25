import { Flex, Stack, styled } from 'leather-styles/jsx';
import { bitcoinStakingContent } from '~/content/bitcoin-staking-content';
import { type BitcoinStakingPool } from '~/data/bitcoin-staking-data';
import { toHumanReadableMicroStx } from '~/utils/unit-convert';

import { Button } from '@leather.io/ui';
import { stxToMicroStx } from '@leather.io/utils';

import { StakingAcknowledgment } from '../../components/staking-acknowledgment';
import { StakingConfirmMessage } from '../../components/staking-confirm-message';
import {
  shakeKeyframes,
  shakeTiming,
  useAttentionAnimation,
} from '../../hooks/use-attention-animation';
import { type StakingAcknowledgmentState } from '../../hooks/use-staking-acknowledgment';
import { type StakingConnectAction } from '../../hooks/use-staking-connect-action';

interface StakingConfirmationStepsProps {
  pool: BitcoinStakingPool | null;
  stakeAmount: number | undefined;
  cycles: number | undefined;
  estimatedUnlockDate: Date | null;
  acknowledgment: StakingAcknowledgmentState;
  onConfirm(): void;
  isBusy?: boolean;
  isDisabled?: boolean;
  connectAction?: StakingConnectAction;
}

export function StakingConfirmationSteps({
  pool,
  stakeAmount,
  cycles,
  estimatedUnlockDate,
  acknowledgment,
  onConfirm,
  isBusy = false,
  isDisabled = false,
  connectAction = { status: 'connected' },
}: StakingConfirmationStepsProps) {
  const stxAmount = stakeAmount === undefined ? undefined : stxToMicroStx(stakeAmount);
  const hasCycles = cycles !== undefined && Number.isInteger(cycles) && cycles > 0;
  const content = bitcoinStakingContent.acknowledgment;
  const connectContent = bitcoinStakingContent.connectGate;
  const isAwaitingConnection = connectAction.status !== 'connected';
  const buttonRef = useAttentionAnimation<HTMLDivElement>(
    acknowledgment.attemptCount,
    shakeKeyframes,
    shakeTiming
  );

  return (
    <Stack
      borderWidth={1}
      borderColor="ink.border-default"
      borderRadius="md"
      gap="0"
      bg="ink.background-primary"
    >
      <Stack p="space.05" gap="space.02" borderBottomWidth={1} borderColor="ink.border-default">
        <styled.h2 textStyle="label.01">You&apos;ll stake</styled.h2>
        <styled.span textStyle="heading.04">
          {stxAmount === undefined ? '—' : toHumanReadableMicroStx(stxAmount)}
        </styled.span>
        {hasCycles && (
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            {cycles === 1 ? '1 cycle' : `${cycles} cycles`}
            {estimatedUnlockDate && (
              <>
                {' · '}
                {content.scheduledEnd.toLowerCase()} ~
                {estimatedUnlockDate.toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </>
            )}
          </styled.span>
        )}
      </Stack>
      <Stack p="space.05" gap="space.05">
        {(connectAction.status === 'install' || connectAction.status === 'connect') && (
          <Flex
            alignItems="center"
            justifyContent="space-between"
            gap="space.04"
            data-testid="confirmation-connect-step"
          >
            <styled.p textStyle="label.02">
              {connectAction.status === 'install'
                ? connectContent.installStep
                : connectContent.connectStep}
            </styled.p>
            <Button size="sm" onClick={() => void connectAction.run()}>
              {connectAction.status === 'install'
                ? connectContent.installAction
                : connectContent.connectAction}
            </Button>
          </Flex>
        )}
        <StakingAcknowledgment
          pool={pool}
          acknowledgment={acknowledgment}
          disabled={isBusy || isAwaitingConnection}
        />
        <Stack>
          <styled.div ref={buttonRef}>
            <Button
              fullWidth
              disabled={isBusy || isDisabled || isAwaitingConnection}
              aria-busy={isBusy || connectAction.status === 'pending' || undefined}
              onClick={() => {
                if (acknowledgment.requireAccepted()) onConfirm();
              }}
              data-testid="confirmation-stake-button"
            >
              {content.confirmStake}
            </Button>
          </styled.div>
          <StakingConfirmMessage
            message={acknowledgment.isInvalid ? content.requiredMessage : undefined}
          />
        </Stack>
      </Stack>
    </Stack>
  );
}
