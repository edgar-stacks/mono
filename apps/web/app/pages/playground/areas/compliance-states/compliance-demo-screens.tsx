import { type ReactNode, useEffect, useState } from 'react';

import { Flex, Stack, styled } from 'leather-styles/jsx';

import { Button, SkeletonLoader } from '@leather.io/ui';

import { mockAccount, screeningDurationMs } from '../compliance-shared/compliance-content';
import { Screen } from '../compliance-shared/compliance-screen-parts';
import type { GateState } from '../compliance-shared/compliance-screens';

type Verdict = Exclude<GateState, 'screening'>;

export function useScreening(initialVerdict: Verdict) {
  const [verdict, setVerdict] = useState(initialVerdict);
  const [screening, setScreening] = useState(true);

  useEffect(() => {
    if (!screening) return;
    const timer = setTimeout(() => setScreening(false), screeningDurationMs);
    return () => clearTimeout(timer);
  }, [screening]);

  const state: GateState = screening ? 'screening' : verdict;
  return {
    state,
    rescreen(nextVerdict: Verdict) {
      setVerdict(nextVerdict);
      setScreening(true);
    },
  };
}

interface ScreenThenLockoutProps {
  screen(screening: boolean): ReactNode;
  lockout: ReactNode;
}

export function ScreenThenLockout({ screen, lockout }: ScreenThenLockoutProps) {
  const { state } = useScreening('refused');
  return state === 'screening' ? screen(true) : lockout;
}

interface HomeScreenProps {
  screening: boolean;
}

export function HomeScreen({ screening }: HomeScreenProps) {
  return (
    <Screen
      title={mockAccount.name}
      footer={
        <Flex gap="space.02" css={{ '& > *': { flex: 1 } }}>
          <SkeletonLoader isLoading={screening} height="48px" borderRadius="round">
            <Button size="lg">Send</Button>
          </SkeletonLoader>
          <SkeletonLoader isLoading={screening} height="48px" borderRadius="round">
            <Button size="lg" variant="outline">
              Receive
            </Button>
          </SkeletonLoader>
        </Flex>
      }
    >
      <Stack gap="space.05">
        <SkeletonLoader isLoading={screening} width="160px" height="40px">
          <styled.span textStyle="heading.02">{mockAccount.totalFiat}</styled.span>
        </SkeletonLoader>
        <Stack gap="space.03">
          {mockAccount.balances.map(balance => (
            <Flex key={balance.symbol} justifyContent="space-between" alignItems="center">
              <Stack gap="space.01">
                <styled.span textStyle="label.02">{balance.name}</styled.span>
                <styled.span textStyle="caption.01" color="ink.text-subdued">
                  {balance.symbol}
                </styled.span>
              </Stack>
              <SkeletonLoader isLoading={screening} width="72px" height="20px">
                <Stack gap="space.01" alignItems="flex-end">
                  <styled.span textStyle="label.02">{balance.fiat}</styled.span>
                  <styled.span textStyle="caption.01" color="ink.text-subdued">
                    {balance.amount} {balance.symbol}
                  </styled.span>
                </Stack>
              </SkeletonLoader>
            </Flex>
          ))}
        </Stack>
      </Stack>
    </Screen>
  );
}
