import { useEffect, useState } from 'react';

import { Flex, Grid, Stack, styled } from 'leather-styles/jsx';

import { Button, SkeletonLoader } from '@leather.io/ui';

import {
  type ComplianceVerdict,
  type ComplianceWallet,
  complianceCopy,
  mockAccount,
  mockSecretKey,
  screeningDurationMs,
} from '../compliance-shared/compliance-content';
import {
  FooterActions,
  ScreenLayout,
  ScreenTitle,
} from '../compliance-shared/compliance-screen-parts';
import { LockoutScreen } from '../compliance-shared/compliance-screens';
import type { ScreeningResult } from './compliance-state-list';

const mockPassword = 'password1234';

export function useScreening(result: ScreeningResult) {
  const [verdict, setVerdict] = useState<ComplianceVerdict>('screening');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setVerdict('screening');
    const timer = window.setTimeout(() => setVerdict(result), screeningDurationMs);
    return () => window.clearTimeout(timer);
  }, [result, attempt]);

  return {
    verdict,
    retry() {
      setAttempt(value => value + 1);
    },
  };
}

interface LockedFlowProps {
  onWhy(): void;
  onDispute(): void;
}

export function HomeScreen({ onWhy, onDispute }: LockedFlowProps) {
  const { verdict } = useScreening('flagged');

  if (verdict !== 'screening') return <LockoutScreen onWhy={onWhy} onDispute={onDispute} />;

  return (
    <ScreenLayout
      footer={
        <FooterActions>
          <SkeletonLoader isLoading width="100%" height="48px" borderRadius="round" />
          <SkeletonLoader isLoading width="100%" height="48px" borderRadius="round" />
        </FooterActions>
      }
    >
      <Stack gap="space.01">
        <styled.span textStyle="label.03" color="ink.text-subdued">
          {mockAccount.name}
        </styled.span>
        <SkeletonLoader isLoading width="160px" height="36px" />
      </Stack>
      <Stack gap="space.03">
        {mockAccount.assets.map(asset => (
          <Flex key={asset.symbol} justifyContent="space-between" alignItems="center">
            <Stack gap="0">
              <styled.span textStyle="label.02">{asset.name}</styled.span>
              <styled.span textStyle="caption.01" color="ink.text-subdued">
                {asset.symbol}
              </styled.span>
            </Stack>
            <SkeletonLoader isLoading width="80px" height="20px" />
          </Flex>
        ))}
      </Stack>
    </ScreenLayout>
  );
}

interface KeyBackupScreenProps {
  wallet: ComplianceWallet;
  onDone(): void;
}

export function KeyBackupScreen({ wallet, onDone }: KeyBackupScreenProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [revealed, setRevealed] = useState(false);

  if (!unlocked) {
    return (
      <ScreenLayout
        footer={
          <FooterActions>
            <Button size="lg" variant="solid" flex={1} onClick={() => setUnlocked(true)}>
              Continue
            </Button>
          </FooterActions>
        }
      >
        <ScreenTitle
          title={complianceCopy.keyBackup.title}
          caption={complianceCopy.keyBackup.prompt(wallet.name)}
        />
        <styled.input
          type="password"
          aria-label="Password"
          defaultValue={mockPassword}
          px="space.04"
          height="48px"
          borderWidth={1}
          borderColor="ink.border-default"
          borderRadius="sm"
          textStyle="body.02"
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      footer={
        <FooterActions>
          <Button size="lg" variant="solid" flex={1} onClick={onDone}>
            {complianceCopy.keyBackup.confirm}
          </Button>
        </FooterActions>
      }
    >
      <ScreenTitle
        title={complianceCopy.keyBackup.keyTitle(wallet.name)}
        caption={complianceCopy.keyBackup.warning}
      />
      <styled.button
        type="button"
        onClick={() => setRevealed(true)}
        position="relative"
        cursor={revealed ? 'default' : 'pointer'}
        borderRadius="sm"
        bg="ink.component-background-default"
        p="space.04"
      >
        <Grid
          gridTemplateColumns="repeat(3, 1fr)"
          gap="space.02"
          filter={revealed ? 'none' : 'blur(6px)'}
        >
          {mockSecretKey.map((word, index) => (
            <styled.span key={`${index}-${word}`} textStyle="label.03" textAlign="left">
              {index + 1}. {word}
            </styled.span>
          ))}
        </Grid>
        {!revealed && (
          <Flex position="absolute" inset={0} alignItems="center" justifyContent="center">
            <styled.span textStyle="label.02" color="ink.text-primary">
              {complianceCopy.keyBackup.reveal}
            </styled.span>
          </Flex>
        )}
      </styled.button>
    </ScreenLayout>
  );
}
