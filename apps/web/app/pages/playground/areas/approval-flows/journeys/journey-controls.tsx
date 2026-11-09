import { useState } from 'react';
import { Link } from 'react-router';

import { Flex, styled } from 'leather-styles/jsx';

import { canvasButton, canvasSelect } from '../canvas/canvas-styles';
import { formatUsd } from '../scenarios/approval-assets';
import {
  type JourneyOutcome,
  type JourneyRun,
  type JourneyTransaction,
  journeyOutcomes,
} from './journey-state';
import { type WorldAccount, accountUsdValue } from './journey-world';

const outcomeLabels: Record<JourneyOutcome, string> = {
  success: 'Confirms',
  'pre-broadcast-failure': 'Fails before broadcast',
  'on-chain-failure': 'Fails on-chain',
};

function downloadSession(run: JourneyRun, history: JourneyTransaction[]) {
  const session = { exportedAt: new Date().toISOString(), run, history };
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `approval-flows-${run.familyId}-${run.runId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

interface WalletReferenceProps {
  start: WorldAccount[];
  now: WorldAccount[];
}

function WalletReference({ start, now }: WalletReferenceProps) {
  return (
    <Flex direction="column" gap="space.01" aria-label="Wallet reference">
      {start.map((account, index) => (
        <Flex key={account.id} justifyContent="space-between" gap="space.03">
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            {account.label}
          </styled.span>
          <styled.span textStyle="caption.01" color="ink.text-primary">
            {formatUsd(accountUsdValue(account))} →{' '}
            {formatUsd(accountUsdValue(now[index] ?? account))}
          </styled.span>
        </Flex>
      ))}
    </Flex>
  );
}

interface JourneyControlsProps {
  run: JourneyRun;
  history: JourneyTransaction[];
  startWorld: WorldAccount[];
  world: WorldAccount[];
  testerLink: string;
  bottomInset: number;
  onRestart(): void;
  onResetHistory(): void;
  onOutcomeChange(outcome: JourneyOutcome): void;
}

export function JourneyControls({
  run,
  history,
  startWorld,
  world,
  testerLink,
  bottomInset,
  onRestart,
  onResetHistory,
  onOutcomeChange,
}: JourneyControlsProps) {
  const [open, setOpen] = useState(false);
  const outcomeLocked = run.phase === 'pending' || run.phase === 'failed';

  return (
    <Flex
      position="fixed"
      right={{ base: 'space.02', md: 'space.05' }}
      zIndex={1100}
      direction="column"
      alignItems="flex-end"
      gap="space.02"
      style={{ bottom: bottomInset + 12 }}
    >
      {open ? (
        <Flex
          id="approval-flow-controls"
          direction="column"
          gap="space.03"
          p="space.04"
          width="300px"
          maxWidth="calc(100vw - 16px)"
          borderRadius="md"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="ink.border-default"
          bg="ink.background-primary"
          boxShadow="0 12px 40px rgba(0,0,0,0.16)"
        >
          <styled.label display="flex" flexDirection="column" gap="space.01" textStyle="caption.01">
            <styled.span color="ink.text-subdued">Network outcome</styled.span>
            <select
              className={canvasSelect}
              value={run.outcome}
              disabled={outcomeLocked}
              onChange={event => {
                const outcome = journeyOutcomes.find(candidate => candidate === event.target.value);
                if (outcome) onOutcomeChange(outcome);
              }}
            >
              {journeyOutcomes.map(outcome => (
                <option key={outcome} value={outcome}>
                  {outcomeLabels[outcome]}
                </option>
              ))}
            </select>
          </styled.label>
          <WalletReference start={startWorld} now={world} />
          <Flex gap="space.02" flexWrap="wrap">
            <button type="button" className={canvasButton} onClick={onRestart}>
              Restart
            </button>
            <button
              type="button"
              className={canvasButton}
              onClick={() => downloadSession(run, history)}
            >
              Export session
            </button>
            <button type="button" className={canvasButton} onClick={onResetHistory}>
              Reset wallet
            </button>
            <Link to={testerLink} target="_blank" rel="noreferrer" className={canvasButton}>
              Fresh tester link
            </Link>
          </Flex>
          <styled.span textStyle="caption.02" color="ink.text-subdued">
            Run {run.runId} · request {run.revision}
          </styled.span>
        </Flex>
      ) : null}
      <button
        type="button"
        className={canvasButton}
        aria-expanded={open}
        aria-controls="approval-flow-controls"
        onClick={() => setOpen(value => !value)}
      >
        Controls
      </button>
    </Flex>
  );
}
