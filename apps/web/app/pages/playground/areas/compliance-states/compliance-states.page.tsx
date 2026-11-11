import { useEffect, useState } from 'react';

import { Flex, Grid, Stack, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import {
  createDisputeDraft,
  createSupportDraft,
  getBackupWallets,
  mockMailContexts,
  mockWallets,
  openMailDraft,
} from '../compliance-shared/compliance-content';
import { PopupFrame, RequestWindowFrame } from '../compliance-shared/compliance-frames';
import {
  ApprovalScreen,
  LockoutScreen,
  SendReviewScreen,
  WhyLockedScreen,
} from '../compliance-shared/compliance-screens';
import { HomeScreen, KeyBackupScreen, useScreening } from './compliance-demo-screens';
import { MailWindow } from './compliance-mail-window';
import { RestoreScreen } from './compliance-onboarding';
import {
  type ComplianceDemoState,
  type ScreeningResult,
  complianceDemoStates,
} from './compliance-state-list';

const walkthroughWallets = mockWallets.several;
const mailContext = mockMailContexts.extension;

function findStateIndex(id: string) {
  return complianceDemoStates.findIndex(state => state.id === id);
}

interface GatedDemoProps {
  result: ScreeningResult;
  onDone(): void;
}

function SendReviewDemo({ result, onDone }: GatedDemoProps) {
  const { verdict, retry } = useScreening(result);

  return (
    <PopupFrame>
      <SendReviewScreen
        verdict={verdict}
        onConfirm={onDone}
        onCancel={onDone}
        onClose={onDone}
        onRetry={retry}
        onContactSupport={() => openMailDraft(createSupportDraft(mailContext))}
      />
    </PopupFrame>
  );
}

function ApprovalDemo({ result, onDone }: GatedDemoProps) {
  const { verdict, retry } = useScreening(result);

  return (
    <RequestWindowFrame>
      <ApprovalScreen
        kind="signPsbt"
        verdict={verdict}
        onConfirm={onDone}
        onCancel={onDone}
        onClose={onDone}
        onRetry={retry}
        onContactSupport={() => openMailDraft(createSupportDraft(mailContext))}
      />
    </RequestWindowFrame>
  );
}

interface DemoStageProps {
  state: ComplianceDemoState;
  onGoTo(id: string): void;
  onNext(): void;
}

function DemoStage({ state, onGoTo, onNext }: DemoStageProps) {
  const [backupWallet] = getBackupWallets(walkthroughWallets);
  const lockedFlow = {
    onWhy: () => onGoTo('why'),
    onDispute: () => onGoTo('dispute-email'),
  };

  switch (state.screen) {
    case 'restore':
      return (
        <PopupFrame>
          <RestoreScreen {...lockedFlow} />
        </PopupFrame>
      );
    case 'home':
      return (
        <PopupFrame>
          <HomeScreen {...lockedFlow} />
        </PopupFrame>
      );
    case 'lockout':
      return (
        <PopupFrame>
          <LockoutScreen {...lockedFlow} />
        </PopupFrame>
      );
    case 'why':
      return (
        <PopupFrame>
          <WhyLockedScreen
            wallets={walkthroughWallets}
            onBackup={() => onGoTo('key-backup')}
            onBack={() => onGoTo('lockout')}
          />
        </PopupFrame>
      );
    case 'key-backup':
      return backupWallet ? (
        <PopupFrame>
          <KeyBackupScreen wallet={backupWallet} onDone={() => onGoTo('why')} />
        </PopupFrame>
      ) : null;
    case 'dispute-email':
      return <MailWindow draft={createDisputeDraft(mailContext)} />;
    case 'send-review':
      return <SendReviewDemo result={state.result ?? 'clean'} onDone={onNext} />;
    case 'approval':
    default:
      return <ApprovalDemo result={state.result ?? 'clean'} onDone={onNext} />;
  }
}

export function ComplianceStatesPage() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const state = complianceDemoStates[index] ?? complianceDemoStates[0];
  const lastIndex = complianceDemoStates.length - 1;

  useEffect(() => {
    if (!playing || !state) return;
    const timer = window.setTimeout(() => {
      if (index >= lastIndex) {
        setPlaying(false);
        return;
      }
      setIndex(index + 1);
    }, state.holdMs);
    return () => window.clearTimeout(timer);
  }, [playing, index, lastIndex, state]);

  function goTo(id: string) {
    const nextIndex = findStateIndex(id);
    if (nextIndex >= 0) setIndex(nextIndex);
  }

  function goToNext() {
    setIndex(Math.min(index + 1, lastIndex));
  }

  if (!state) return null;

  return (
    <Grid
      gridTemplateColumns={{ base: '1fr', lg: '320px minmax(0, 1fr)' }}
      gap="space.07"
      px="space.07"
      py="space.07"
      pb="space.11"
    >
      <Stack gap="space.04">
        <Stack gap="space.02">
          <styled.h1 textStyle="heading.04">Compliance gate walkthrough</styled.h1>
          <styled.p textStyle="body.02" color="ink.text-subdued">
            The screening gate end to end, rendered from the same shared screens as the handoff
            board. Click through, or play it on a timer.
          </styled.p>
        </Stack>
        <Flex gap="space.02" flexWrap="wrap">
          <Button size="sm" variant="solid" onClick={() => setPlaying(value => !value)}>
            {playing ? 'Pause' : 'Play'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIndex(Math.max(index - 1, 0))}>
            Previous
          </Button>
          <Button size="sm" variant="outline" onClick={goToNext}>
            Next
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIndex(0);
              setPlaying(true);
            }}
          >
            Restart
          </Button>
        </Flex>
        <Stack gap="space.01">
          {complianceDemoStates.map((candidate, candidateIndex) => (
            <styled.button
              key={candidate.id}
              type="button"
              onClick={() => setIndex(candidateIndex)}
              display="flex"
              gap="space.03"
              alignItems="baseline"
              textAlign="left"
              px="space.03"
              py="space.02"
              borderRadius="sm"
              cursor="pointer"
              bg={candidate.id === state.id ? 'ink.component-background-default' : 'transparent'}
              _hover={{ bg: 'ink.component-background-hover' }}
            >
              <styled.span textStyle="caption.02" color="ink.text-subdued" width="40px">
                {candidate.scenario}
              </styled.span>
              <styled.span textStyle="label.02" color="ink.text-primary">
                {candidate.title}
              </styled.span>
            </styled.button>
          ))}
        </Stack>
      </Stack>
      <Stack gap="space.05" minWidth={0}>
        <Stack gap="space.01" maxWidth="70ch">
          <styled.span textStyle="caption.02" color="ink.text-subdued">
            {state.scenario}
          </styled.span>
          <styled.h2 textStyle="heading.05">{state.title}</styled.h2>
          <styled.p textStyle="body.02" color="ink.text-subdued">
            {state.description}
          </styled.p>
        </Stack>
        <Flex
          key={state.id}
          justifyContent="center"
          alignItems="flex-start"
          p="space.07"
          borderRadius="md"
          bg="ink.background-secondary"
          overflowX="auto"
        >
          <DemoStage state={state} onGoTo={goTo} onNext={goToNext} />
        </Flex>
      </Stack>
    </Grid>
  );
}
