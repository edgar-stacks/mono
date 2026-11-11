import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { Flex, styled } from 'leather-styles/jsx';

import { Button, CloseIcon, useClipboard } from '@leather.io/ui';

import { formatAssetAmount } from '../scenarios/approval-assets';
import type { ApprovalRequest } from '../scenarios/approval-model';
import { createRunId, prototypeUrl, testerUrl } from './journey-navigation';
import type { JourneyAction, JourneyOutcome, JourneyRun } from './journey-state';
import { createJourneyWorld, portfolioEntries } from './journey-world';

const outcomes: { id: JourneyOutcome; label: string }[] = [
  { id: 'success', label: 'Succeeds' },
  { id: 'broadcast-failure', label: 'Fails before broadcast' },
  { id: 'chain-failure', label: 'Fails on chain' },
];

function ControlGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Flex
      direction="column"
      gap="space.02"
      py="space.03"
      borderTopWidth="1px"
      borderTopStyle="solid"
      borderColor="ink.border-transparent"
    >
      <styled.h3 textStyle="label.03" color="ink.text-subdued">
        {title}
      </styled.h3>
      {children}
    </Flex>
  );
}

function exportSession(run: JourneyRun, request: ApprovalRequest) {
  const session = {
    exportedAt: new Date().toISOString(),
    url: window.location.href,
    request: { title: request.title, method: request.method, requester: request.requester.origin },
    run,
  };
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `approval-flows-${run.journeyId}-${run.runId}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

interface JourneyControlsProps {
  params: URLSearchParams;
  run: JourneyRun;
  request: ApprovalRequest;
  dispatch(action: JourneyAction): void;
  onClose(): void;
}

export function JourneyControls({ params, run, request, dispatch, onClose }: JourneyControlsProps) {
  const navigate = useNavigate();
  const testerLink = `${window.location.origin}${window.location.pathname}${testerUrl(params)}`;
  const clipboard = useClipboard(testerLink);
  const reference = createJourneyWorld(run.wallet);
  const referencePortfolio = request.vault
    ? reference.portfolios.vault
    : reference.portfolios.account;
  const currentPortfolio = request.vault ? run.portfolios.vault : run.portfolios.account;

  function restart() {
    void navigate(
      prototypeUrl(params, { journey: run.journeyId, variant: run.variantId }, createRunId())
    );
  }

  return (
    <styled.aside
      display="flex"
      flexDirection="column"
      width={{ base: '100%', lg: '300px' }}
      flexShrink={0}
      px="space.04"
      py="space.03"
      bg="ink.background-primary"
      borderLeftWidth={{ base: '0', lg: '1px' }}
      borderTopWidth={{ base: '1px', lg: '0' }}
      borderStyle="solid"
      borderColor="ink.border-transparent"
      overflowY="auto"
      aria-label="Controls"
    >
      <Flex justifyContent="space-between" alignItems="center" pb="space.02">
        <styled.h2 textStyle="label.01" color="ink.text-primary">
          Controls
        </styled.h2>
        <styled.button
          type="button"
          onClick={onClose}
          aria-label="Close controls"
          cursor="pointer"
          p="space.01"
        >
          <CloseIcon variant="small" />
        </styled.button>
      </Flex>
      <ControlGroup title="Session">
        <Flex gap="space.02" flexWrap="wrap">
          <Button variant="outline" size="sm" onClick={restart}>
            Restart
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportSession(run, request)}>
            Export session
          </Button>
        </Flex>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Run {run.runId} · {run.events.length} events
        </styled.span>
      </ControlGroup>
      <ControlGroup title="Next submitted transaction">
        {outcomes.map(outcome => (
          <styled.label key={outcome.id} display="flex" alignItems="center" gap="space.02">
            <input
              type="radio"
              name="journey-outcome"
              checked={run.outcome === outcome.id}
              onChange={() =>
                dispatch({ type: 'set-outcome', runId: run.runId, outcome: outcome.id })
              }
            />
            <styled.span textStyle="caption.01" color="ink.text-primary">
              {outcome.label}
            </styled.span>
          </styled.label>
        ))}
      </ControlGroup>
      <ControlGroup title={`Wallet reference · ${reference.referenceDate}`}>
        {portfolioEntries(referencePortfolio).map(entry => {
          const current = { symbol: entry.symbol, amount: currentPortfolio[entry.symbol] ?? 0 };
          const changed = current.amount !== entry.amount;
          return (
            <Flex key={entry.symbol} justifyContent="space-between" gap="space.02">
              <styled.span textStyle="caption.01" color="ink.text-subdued">
                {formatAssetAmount(entry)}
              </styled.span>
              <styled.span
                textStyle="caption.01"
                color={changed ? 'ink.text-primary' : 'ink.text-subdued'}
              >
                {changed ? `now ${formatAssetAmount(current)}` : 'unchanged'}
              </styled.span>
            </Flex>
          );
        })}
      </ControlGroup>
      <ControlGroup title="Tester link">
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          A fresh session without review controls.
        </styled.span>
        <Flex gap="space.02" flexWrap="wrap">
          <Button variant="outline" size="sm" onClick={clipboard.onCopy}>
            {clipboard.hasCopied ? 'Copied' : 'Copy link'}
          </Button>
          <styled.a
            href={testerLink}
            target="_blank"
            rel="noreferrer"
            textStyle="label.03"
            color="ink.action-primary-default"
            alignSelf="center"
          >
            Open
          </styled.a>
        </Flex>
      </ControlGroup>
    </styled.aside>
  );
}
