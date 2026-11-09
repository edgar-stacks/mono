import { type ReactNode, useState } from 'react';

import { walletSets } from '../compliance-shared/compliance-content';
import type { ExtensionFrameKind } from '../compliance-shared/compliance-frames';
import {
  DappApprovalScreen,
  KeyBackupScreen,
  type KeyBackupStage,
  LockoutScreen,
  SendReviewScreen,
  WhyLockedScreen,
} from '../compliance-shared/compliance-screens';
import { HomeScreen, ScreenThenLockout, useScreening } from './compliance-demo-screens';
import { MailWindow } from './compliance-mail-window';
import { RestoreScreen } from './compliance-onboarding';

interface WalkthroughControls {
  goTo(id: string): void;
  next(): void;
}

export interface WalkthroughState {
  id: string;
  scenario: string;
  title: string;
  note: string;
  frame: ExtensionFrameKind | 'mail';
  durationMs: number;
  render(controls: WalkthroughControls): ReactNode;
}

function LockedLockout({ goTo }: WalkthroughControls) {
  return <LockoutScreen onWhy={() => goTo('why')} onDispute={() => goTo('dispute-email')} />;
}

function KeyBackupDemo({ goTo }: WalkthroughControls) {
  const [stage, setStage] = useState<KeyBackupStage>('password');
  return (
    <KeyBackupScreen
      stage={stage}
      onBack={() => goTo('why')}
      onUnlock={() => setStage('hidden')}
      onReveal={() => setStage('revealed')}
      onDone={() => goTo('why')}
    />
  );
}

interface GatedDemoProps extends WalkthroughControls {
  verdict: 'clean' | 'refused' | 'no-answer';
}

function SendReviewDemo({ verdict, next }: GatedDemoProps) {
  const { state, rescreen } = useScreening(verdict);
  return (
    <SendReviewScreen
      state={state}
      onPrimary={next}
      onCancel={next}
      onClose={next}
      onRetry={() => rescreen('clean')}
    />
  );
}

function DappApprovalDemo({ verdict, next }: GatedDemoProps) {
  const { state, rescreen } = useScreening(verdict);
  return (
    <DappApprovalScreen
      request="signPsbt"
      state={state}
      onPrimary={next}
      onCancel={next}
      onClose={next}
      onRetry={() => rescreen('clean')}
    />
  );
}

const lockoutHoldMs = 6000;
const reviewHoldMs = 5000;

export const walkthroughStates: WalkthroughState[] = [
  {
    id: 'restore-lockout',
    scenario: 'S1',
    title: 'Restore → lockout',
    note: 'Restoring a wallet screens its addresses before anything else; a match locks Leather straight away.',
    frame: 'tab',
    durationMs: lockoutHoldMs,
    render(controls) {
      return (
        <ScreenThenLockout
          screen={screening => <RestoreScreen restoring={screening} />}
          lockout={<LockedLockout {...controls} />}
        />
      );
    },
  },
  {
    id: 'home-lockout',
    scenario: 'S2',
    title: 'Home → lockout',
    note: 'An existing wallet is screened on open: balances and actions shimmer until the verdict, then the lockout replaces Home.',
    frame: 'popup',
    durationMs: lockoutHoldMs,
    render(controls) {
      return (
        <ScreenThenLockout
          screen={screening => <HomeScreen screening={screening} />}
          lockout={<LockedLockout {...controls} />}
        />
      );
    },
  },
  {
    id: 'lockout',
    scenario: 'S3',
    title: 'Lockout',
    note: 'The whole app is locked. Why am I seeing this? explains; Dispute this opens a prefilled email.',
    frame: 'popup',
    durationMs: reviewHoldMs,
    render(controls) {
      return <LockedLockout {...controls} />;
    },
  },
  {
    id: 'why',
    scenario: 'S4',
    title: 'Why Leather is locked',
    note: 'Wallets 1 and 3 were created in Leather, Wallet 2 was imported and one is a Ledger: only Wallets 1 and 3 get a backup link.',
    frame: 'popup',
    durationMs: reviewHoldMs,
    render({ goTo }) {
      return (
        <WhyLockedScreen
          wallets={walletSets.severalWallets}
          onBack={() => goTo('lockout')}
          onBackup={() => goTo('key-backup')}
        />
      );
    },
  },
  {
    id: 'key-backup',
    scenario: 'S5',
    title: 'Key backup',
    note: 'The password unlocks the Secret Key, which stays blurred until revealed.',
    frame: 'popup',
    durationMs: reviewHoldMs,
    render(controls) {
      return <KeyBackupDemo {...controls} />;
    },
  },
  {
    id: 'dispute-email',
    scenario: 'S6',
    title: 'Dispute email',
    note: 'Dispute this opens a draft to the compliance inbox, prefilled with app version, platform, time and a reference ID.',
    frame: 'mail',
    durationMs: reviewHoldMs,
    render() {
      return <MailWindow />;
    },
  },
  {
    id: 'send-clean',
    scenario: 'S11',
    title: 'Send review, clean',
    note: 'Actions shimmer while the recipient is screened, then Send appears.',
    frame: 'popup',
    durationMs: reviewHoldMs,
    render(controls) {
      return <SendReviewDemo verdict="clean" {...controls} />;
    },
  },
  {
    id: 'send-flagged',
    scenario: 'S11a',
    title: 'Send review, flagged recipient',
    note: 'The recipient is restricted: a Callout and Close replace Send.',
    frame: 'popup',
    durationMs: reviewHoldMs,
    render(controls) {
      return <SendReviewDemo verdict="refused" {...controls} />;
    },
  },
  {
    id: 'send-no-answer',
    scenario: 'S11b',
    title: 'Send review, no answer',
    note: 'Screening returned no verdict, so nothing is sent. Try again screens once more.',
    frame: 'popup',
    durationMs: reviewHoldMs,
    render(controls) {
      return <SendReviewDemo verdict="no-answer" {...controls} />;
    },
  },
  {
    id: 'approve-clean',
    scenario: 'S12',
    title: 'dApp approval, clean',
    note: 'A signPsbt request from dapp.example is screened, then Approve appears.',
    frame: 'request',
    durationMs: reviewHoldMs,
    render(controls) {
      return <DappApprovalDemo verdict="clean" {...controls} />;
    },
  },
  {
    id: 'approve-flagged',
    scenario: 'S12a',
    title: 'dApp approval, flagged counterparty',
    note: 'Another party is restricted: a Callout and Close replace Approve.',
    frame: 'request',
    durationMs: reviewHoldMs,
    render(controls) {
      return <DappApprovalDemo verdict="refused" {...controls} />;
    },
  },
  {
    id: 'approve-no-answer',
    scenario: 'S12b',
    title: 'dApp approval, no answer',
    note: 'Screening returned no verdict, so nothing is signed. Try again screens once more.',
    frame: 'request',
    durationMs: reviewHoldMs,
    render(controls) {
      return <DappApprovalDemo verdict="no-answer" {...controls} />;
    },
  },
];
