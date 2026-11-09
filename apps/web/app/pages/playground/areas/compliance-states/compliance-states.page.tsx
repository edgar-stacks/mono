import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router';

import { Flex, Stack, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import {
  complianceReviews,
  complianceWalletSets,
  mockDappOrigin,
} from '../compliance-shared/compliance-content';
import { ComplianceFrame } from '../compliance-shared/compliance-frames';
import {
  KeyBackupScreen,
  LockoutScreen,
  WhyLockedScreen,
} from '../compliance-shared/compliance-screens';
import { HomeThenLockout, ScreenedReview } from './compliance-demo-screens';
import { ComplianceMailWindow } from './compliance-mail-window';
import { RestoreWalletScreen } from './compliance-onboarding';
import { type WalkthroughStateId, walkthroughStates } from './compliance-walkthrough-states';

const stateParam = 'state';
const backupWalletName = 'Wallet 1';

interface WalkthroughScreenProps {
  stateId: WalkthroughStateId;
  goTo(id: WalkthroughStateId): void;
  next(): void;
}

function WalkthroughScreen({ stateId, goTo, next }: WalkthroughScreenProps) {
  const showLockout = useCallback(() => goTo('lockout'), [goTo]);

  switch (stateId) {
    case 'restore-lockout':
      return (
        <ComplianceFrame kind="popup">
          <RestoreWalletScreen onRestored={showLockout} />
        </ComplianceFrame>
      );
    case 'home-lockout':
      return (
        <ComplianceFrame kind="popup">
          <HomeThenLockout onLocked={showLockout} />
        </ComplianceFrame>
      );
    case 'lockout':
      return (
        <ComplianceFrame kind="popup">
          <LockoutScreen onWhy={() => goTo('why')} onDispute={() => goTo('dispute-email')} />
        </ComplianceFrame>
      );
    case 'why':
      return (
        <ComplianceFrame kind="popup">
          <WhyLockedScreen
            wallets={complianceWalletSets.several}
            onBack={showLockout}
            onBackup={() => goTo('key-backup')}
          />
        </ComplianceFrame>
      );
    case 'key-backup':
      return (
        <ComplianceFrame kind="popup">
          <KeyBackupScreen
            walletName={backupWalletName}
            onBack={() => goTo('why')}
            onDone={() => goTo('why')}
          />
        </ComplianceFrame>
      );
    case 'dispute-email':
      return (
        <ComplianceFrame kind="request" origin="Mail">
          <ComplianceMailWindow kind="dispute" onClose={showLockout} />
        </ComplianceFrame>
      );
    case 'review-clean':
      return (
        <ComplianceFrame kind="popup">
          <ScreenedReview review={complianceReviews.send} verdict="clean" onFinish={next} />
        </ComplianceFrame>
      );
    case 'review-flagged':
      return (
        <ComplianceFrame kind="popup">
          <ScreenedReview review={complianceReviews.send} verdict="flagged" onFinish={next} />
        </ComplianceFrame>
      );
    case 'review-no-answer':
      return (
        <ComplianceFrame kind="popup">
          <ScreenedReview review={complianceReviews.send} verdict="no-answer" onFinish={next} />
        </ComplianceFrame>
      );
    case 'approve-clean':
      return (
        <ComplianceFrame kind="request" origin={mockDappOrigin}>
          <ScreenedReview review={complianceReviews.psbt} verdict="clean" onFinish={next} />
        </ComplianceFrame>
      );
    case 'approve-flagged':
      return (
        <ComplianceFrame kind="request" origin={mockDappOrigin}>
          <ScreenedReview
            review={complianceReviews.contractCall}
            verdict="flagged"
            onFinish={next}
          />
        </ComplianceFrame>
      );
    case 'approve-no-answer':
      return (
        <ComplianceFrame kind="request" origin={mockDappOrigin}>
          <ScreenedReview
            review={complianceReviews.contractCall}
            verdict="no-answer"
            onFinish={next}
          />
        </ComplianceFrame>
      );
    default:
      return null;
  }
}

export function ComplianceStatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [replayCount, setReplayCount] = useState(0);
  const currentIndex = Math.max(
    walkthroughStates.findIndex(state => state.id === searchParams.get(stateParam)),
    0
  );
  const current = walkthroughStates[currentIndex];

  const goTo = useCallback(
    (id: WalkthroughStateId) => setSearchParams({ [stateParam]: id }, { replace: true }),
    [setSearchParams]
  );

  function goToIndex(index: number) {
    const state = walkthroughStates[index];
    if (state) goTo(state.id);
  }

  return (
    <Flex gap="space.09" px="space.07" py="space.07" pb="space.11" alignItems="flex-start">
      <Stack gap="space.05" width="320px" flexShrink={0}>
        <Stack gap="space.02">
          <styled.h1 textStyle="heading.04">Compliance gate walkthrough</styled.h1>
          <styled.p textStyle="caption.01" color="ink.text-subdued">
            Clickable, timed walkthrough of the shared compliance screens. Screening takes 1.6
            seconds. Mock data only.
          </styled.p>
        </Stack>
        <Stack as="ol" gap="space.01">
          {walkthroughStates.map((state, index) => (
            <styled.li key={state.id} listStyle="none">
              <styled.button
                type="button"
                onClick={() => goTo(state.id)}
                aria-current={index === currentIndex ? 'step' : undefined}
                width="100%"
                textAlign="left"
                px="space.03"
                py="space.02"
                borderRadius="sm"
                cursor="pointer"
                bg={index === currentIndex ? 'ink.component-background-pressed' : 'transparent'}
                _hover={{ bg: 'ink.component-background-hover' }}
              >
                <Flex gap="space.02" alignItems="baseline">
                  <styled.code textStyle="caption.02" color="ink.text-subdued" width="40px">
                    {state.scenario}
                  </styled.code>
                  <styled.span textStyle="label.03">{state.title}</styled.span>
                </Flex>
              </styled.button>
            </styled.li>
          ))}
        </Stack>
      </Stack>
      <Stack gap="space.04" alignItems="flex-start">
        <Stack gap="space.01" maxWidth="60ch">
          <styled.h2 textStyle="label.01">
            {current.scenario} · {current.title}
          </styled.h2>
          <styled.p textStyle="caption.01" color="ink.text-subdued">
            {current.description}
          </styled.p>
        </Stack>
        <Flex gap="space.02">
          <Button
            size="sm"
            variant="outline"
            disabled={currentIndex === 0}
            onClick={() => goToIndex(currentIndex - 1)}
          >
            Previous
          </Button>
          <Button size="sm" variant="outline" onClick={() => setReplayCount(count => count + 1)}>
            Replay
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={currentIndex === walkthroughStates.length - 1}
            onClick={() => goToIndex(currentIndex + 1)}
          >
            Next
          </Button>
        </Flex>
        <WalkthroughScreen
          key={`${current.id}-${replayCount}`}
          stateId={current.id}
          goTo={goTo}
          next={() => goToIndex(currentIndex + 1)}
        />
      </Stack>
    </Flex>
  );
}
