import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { Box, Flex, Grid, styled } from 'leather-styles/jsx';

import { canvasButton, canvasSelect } from '../canvas/canvas-styles';
import type { ApprovalDirection } from '../directions/direction-registry';
import { approvalSections } from '../scenarios/approval-scenario.types';
import { JourneyActivity } from './journey-activity';
import { JourneyAppSurface } from './journey-app-surface';
import { JourneyControls } from './journey-controls';
import { journeyFamilies, resolveJourney } from './journey-definitions';
import {
  type ApprovalFlowParams,
  catalogReturnUrl,
  createRunId,
  prototypeUrl,
  testerUrl,
} from './journey-navigation';
import { journeyRequestKey, pendingTransaction } from './journey-state';
import { useJourneySession } from './journey-store';
import { JourneyWalletPopover } from './journey-wallet-popover';
import { JourneyWalletView, type WalletActionType } from './journey-wallet-views';
import { applyWorldTransactions, createJourneyWorld } from './journey-world';
import { usePlaygroundDockInset } from './use-playground-dock-inset';

const settleMs = 2400;

interface JourneyStripProps {
  params: ApprovalFlowParams;
  familyId: string;
  variantId: string;
  onSwitch(target: { journey: string; variant?: string; wallet?: string }): void;
}

function JourneyStrip({ params, familyId, variantId, onSwitch }: JourneyStripProps) {
  const family = journeyFamilies.find(candidate => candidate.id === familyId);
  return (
    <Flex
      position="sticky"
      top={0}
      zIndex={10}
      alignItems="center"
      gap="space.02"
      flexWrap="wrap"
      px={{ base: 'space.03', md: 'space.06' }}
      py="space.02"
      bg="ink.background-primary"
      borderBottomWidth="1px"
      borderBottomStyle="solid"
      borderColor="ink.border-default"
    >
      {params.participant ? null : (
        <Link to={catalogReturnUrl(params.returnTo)} className={canvasButton}>
          Screens
        </Link>
      )}
      <select
        aria-label="Scenario"
        className={canvasSelect}
        value={familyId}
        onChange={event => onSwitch({ journey: event.target.value })}
      >
        {approvalSections.map(section => (
          <optgroup key={section.id} label={section.label}>
            {journeyFamilies
              .filter(candidate => candidate.section === section.id)
              .map(candidate => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      {family && family.variants.length > 1 ? (
        <select
          aria-label="Variant"
          className={canvasSelect}
          value={variantId}
          onChange={event => onSwitch({ journey: familyId, variant: event.target.value })}
        >
          {family.variants.map(variant => (
            <option key={variant.id} value={variant.id}>
              {variant.label}
            </option>
          ))}
        </select>
      ) : null}
      <select
        aria-label="Wallet"
        className={canvasSelect}
        value={params.wallet}
        onChange={event =>
          onSwitch({ journey: familyId, variant: variantId, wallet: event.target.value })
        }
      >
        <option value="software">Software account</option>
        <option value="ledger">Ledger account</option>
      </select>
    </Flex>
  );
}

interface JourneyPrototypeProps {
  params: ApprovalFlowParams;
  runId: string;
  direction: ApprovalDirection;
}

export function JourneyPrototype({ params, runId, direction }: JourneyPrototypeProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const journey = useMemo(
    () =>
      resolveJourney({
        familyId: params.journey,
        variantId: params.variant,
        wallet: params.wallet,
      }),
    [params.journey, params.variant, params.wallet]
  );
  const { run, history, dispatch, resetHistory } = useJourneySession(runId, journey);
  const [walletOpen, setWalletOpen] = useState(false);
  const activityPanel = useRef<HTMLElement>(null);
  const walletOpener = useRef<HTMLElement | null>(null);
  const dockInset = usePlaygroundDockInset();
  const startWorld = useMemo(() => createJourneyWorld(journey.wallet), [journey.wallet]);
  const transactions = [...run.transactions].reverse();
  const world = applyWorldTransactions(startWorld, [...history, ...run.transactions]);

  useEffect(() => {
    if (run.phase !== 'pending') return;
    const key = journeyRequestKey(run);
    const transaction = pendingTransaction(run);
    if (!key || !transaction) return;
    const timer = setTimeout(
      () => dispatch({ type: 'settle', transactionId: transaction.id, ...key }),
      settleMs
    );
    return () => clearTimeout(timer);
  }, [run, dispatch]);

  function switchJourney(target: { journey: string; variant?: string; wallet?: string }) {
    const current = new URLSearchParams(searchParams);
    if (target.wallet) current.set('wallet', target.wallet);
    void navigate(
      prototypeUrl(current, {
        journey: target.journey,
        variant: target.variant,
        run: createRunId(),
      })
    );
  }

  function rememberOpener() {
    walletOpener.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  function requestFromApp() {
    rememberOpener();
    dispatch({ type: 'open', runId: run.runId });
    setWalletOpen(true);
  }

  function onWalletAction(type: WalletActionType) {
    const key = journeyRequestKey(run);
    if (!key) return;
    dispatch({ type, ...key });
    if (type === 'cancel') setWalletOpen(false);
  }

  function dismissWallet() {
    if (run.phase === 'review' || run.phase === 'device') {
      onWalletAction('cancel');
      return;
    }
    setWalletOpen(false);
  }

  function viewActivity() {
    setWalletOpen(false);
    activityPanel.current?.scrollIntoView({ block: 'nearest' });
    activityPanel.current?.focus();
  }

  const latest = transactions[0];

  return (
    <Box minHeight="100vh" bg="ink.background-secondary" style={{ paddingBottom: dockInset + 24 }}>
      <JourneyStrip
        params={params}
        familyId={journey.family.id}
        variantId={journey.variant.id}
        onSwitch={switchJourney}
      />
      <Flex
        direction="column"
        gap="space.02"
        px={{ base: 'space.03', md: 'space.06' }}
        pt="space.04"
      >
        <styled.h1 textStyle="heading.05" color="ink.text-primary">
          {journey.family.title}
          {journey.family.variants.length > 1 ? ` · ${journey.variant.label}` : null}
        </styled.h1>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {journey.family.summary} Illustrative fixtures only: nothing is signed or broadcast.
        </styled.p>
      </Flex>
      <Grid
        gridTemplateColumns={{ base: '1fr', lg: 'minmax(0, 1fr) 360px' }}
        gap="space.04"
        px={{ base: 'space.03', md: 'space.06' }}
        py="space.04"
        alignItems="start"
      >
        <JourneyAppSurface
          app={journey.family.app}
          run={run}
          request={journey.request}
          walletOpen={walletOpen}
          onRequest={requestFromApp}
          onShowWallet={() => {
            rememberOpener();
            setWalletOpen(true);
          }}
          onViewActivity={viewActivity}
        />
        <JourneyActivity
          accounts={world}
          transactions={transactions}
          highlightId={latest?.id ?? null}
          panelRef={activityPanel}
        />
      </Grid>
      {walletOpen && run.phase !== 'app' && run.phase !== 'rejected' ? (
        <JourneyWalletPopover
          key={run.requestId}
          launch={run.plan.kind === 'connect' ? 'handshake' : 'logo'}
          returnFocusTo={walletOpener}
          bottomInset={dockInset}
          onDismiss={dismissWallet}
        >
          <JourneyWalletView
            run={run}
            request={journey.request}
            appName={journey.family.app.name}
            direction={direction}
            animateHeader={run.plan.kind === 'connect'}
            onAction={onWalletAction}
            onClose={() => setWalletOpen(false)}
          />
        </JourneyWalletPopover>
      ) : null}
      {params.participant || !params.controls ? null : (
        <JourneyControls
          run={run}
          history={history}
          startWorld={startWorld}
          world={world}
          testerLink={testerUrl(searchParams)}
          bottomInset={dockInset}
          onRestart={() =>
            switchJourney({ journey: journey.family.id, variant: journey.variant.id })
          }
          onResetHistory={resetHistory}
          onOutcomeChange={outcome => dispatch({ type: 'set-outcome', runId: run.runId, outcome })}
        />
      )}
    </Box>
  );
}
