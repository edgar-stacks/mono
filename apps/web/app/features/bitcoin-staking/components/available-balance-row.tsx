import BigNumber from 'bignumber.js';
import { Box, styled } from 'leather-styles/jsx';
import { link as linkRecipe } from 'leather-styles/recipes';
import { BasicHoverCard } from '~/components/basic-hover-card';
import { bitcoinStakingContent } from '~/content/bitcoin-staking-content';
import { STAKING_TX_FEE_RESERVE_USTX } from '~/pages/bitcoin-staking/bitcoin-staking.constants';
import { toHumanReadableMicroStx } from '~/utils/unit-convert';

import { InfoCircleIcon, Pressable, Spinner } from '@leather.io/ui';
import { microStxToStx } from '@leather.io/utils';

import { type StakingConnectAction } from '../hooks/use-staking-connect-action';

const feeReserveExplanation = `${microStxToStx(STAKING_TX_FEE_RESERVE_USTX).toString()} STX reserved for transaction fees`;

function maxStakeableAmount(availableAmount: BigNumber) {
  return BigNumber.max(availableAmount.minus(STAKING_TX_FEE_RESERVE_USTX), 0);
}

interface AvailableBalanceRowProps {
  isLoading: boolean;
  availableAmount: BigNumber | undefined;
  onSelectMax(maxStakeableStx: number): void;
  connectAction?: StakingConnectAction;
}

export function AvailableBalanceRow({
  isLoading,
  availableAmount,
  onSelectMax,
  connectAction,
}: AvailableBalanceRowProps) {
  const maxAmount = availableAmount ? maxStakeableAmount(availableAmount) : undefined;
  const connectPrompt =
    connectAction?.status === 'install' || connectAction?.status === 'connect'
      ? connectAction
      : undefined;
  const isBalanceLoading = isLoading || connectAction?.status === 'pending';
  const showsBalance = !isBalanceLoading && !connectPrompt;

  return (
    <Box textStyle="body.02" color="ink.text-subdued" aria-busy={isBalanceLoading}>
      <styled.span textStyle="caption">Available balance:</styled.span>
      {isBalanceLoading && <Spinner />}
      {connectPrompt && (
        <Pressable
          type="button"
          className={linkRecipe({ variant: 'underlined' })}
          bg="transparent"
          border="none"
          p="0"
          ml="space.02"
          color="ink.text-primary"
          cursor="pointer"
          onClick={() => void connectPrompt.run()}
        >
          {connectPrompt.status === 'install'
            ? bitcoinStakingContent.connectGate.installBalance
            : bitcoinStakingContent.connectGate.connectBalance}
        </Pressable>
      )}
      {showsBalance && maxAmount && (
        <>
          <styled.button
            type="button"
            className={linkRecipe({ variant: 'underlined' })}
            bg="transparent"
            border="none"
            p="0"
            ml="space.02"
            color="ink.text-primary"
            cursor="pointer"
            onClick={() => onSelectMax(microStxToStx(maxAmount).toNumber())}
          >
            {toHumanReadableMicroStx(maxAmount)}
          </styled.button>
          <BasicHoverCard title="Available balance" content={feeReserveExplanation}>
            <styled.span
              display="inline-flex"
              alignItems="center"
              height="1lh"
              verticalAlign="top"
              ml="space.01"
              cursor="help"
              aria-label="About available balance"
            >
              <InfoCircleIcon variant="small" color="ink.text-subdued" />
            </styled.span>
          </BasicHoverCard>
        </>
      )}
      {showsBalance && !maxAmount && 'Failed to load'}
    </Box>
  );
}
