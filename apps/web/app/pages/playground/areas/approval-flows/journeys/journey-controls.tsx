import { useNavigate } from 'react-router';

import { Flex, styled } from 'leather-styles/jsx';
import { z } from 'zod';

import { Button, useClipboard } from '@leather.io/ui';

import { createRunId, prototypeUrl, testerUrl } from './journey-navigation';
import type { JourneyRun } from './journey-state';
import { exportJourneySession } from './journey-store';
import { type JourneyWalletKind, journeyWalletKinds } from './journey-world';

const networkResults = ['success', 'fail-broadcast', 'fail-chain'] as const;

export type NetworkResult = (typeof networkResults)[number];

const networkResultLabels: Record<NetworkResult, string> = {
  success: 'Confirms',
  'fail-broadcast': 'Fails before broadcast',
  'fail-chain': 'Fails on the network',
};

const walletLabels: Record<JourneyWalletKind, string> = {
  software: 'Software account (with history)',
  ledger: 'Ledger account (with history)',
};

const networkResultSchema = z.enum(networkResults);

const walletKindSchema = z.enum(journeyWalletKinds);

const selectStyles = {
  textStyle: 'label.03',
  px: 'space.02',
  py: 'space.01',
  borderRadius: 'sm',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'ink.border-default',
  bg: 'ink.background-primary',
  color: 'ink.text-primary',
} as const;

interface JourneyControlsProps {
  params: URLSearchParams;
  run: JourneyRun;
  networkResult: NetworkResult;
  onNetworkResult(result: NetworkResult): void;
}

export function JourneyControls({
  params,
  run,
  networkResult,
  onNetworkResult,
}: JourneyControlsProps) {
  const navigate = useNavigate();
  const target = { journeyId: run.journeyId, variantId: run.variantId };
  const testerLink =
    typeof window === 'undefined'
      ? testerUrl(params)
      : `${window.location.origin}${window.location.pathname}${testerUrl(params)}`;
  const clipboard = useClipboard(testerLink);

  function switchWallet(wallet: JourneyWalletKind) {
    const next = new URLSearchParams(params);
    next.set('wallet', wallet);
    void navigate(prototypeUrl(next, target, createRunId()));
  }

  return (
    <Flex
      direction="column"
      gap="space.03"
      p="space.04"
      width={{ base: '100%', md: '300px' }}
      flexShrink={0}
      bg="ink.background-primary"
      borderLeftWidth={{ base: '0', md: '1px' }}
      borderTopWidth={{ base: '1px', md: '0' }}
      borderStyle="solid"
      borderColor="ink.border-default"
      aria-label="Controls"
      role="region"
    >
      <styled.h2 textStyle="label.01" color="ink.text-primary">
        Controls
      </styled.h2>
      <Flex gap="space.02" flexWrap="wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={() => void navigate(prototypeUrl(params, target, createRunId()))}
        >
          Restart
        </Button>
        <Button size="sm" variant="outline" onClick={() => exportJourneySession(run)}>
          Export session
        </Button>
      </Flex>
      <styled.label display="flex" flexDirection="column" gap="space.01">
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Historical wallet
        </styled.span>
        <styled.select
          {...selectStyles}
          value={run.wallet}
          onChange={event => {
            const wallet = walletKindSchema.safeParse(event.target.value).data;
            if (wallet) switchWallet(wallet);
          }}
        >
          {journeyWalletKinds.map(kind => (
            <option key={kind} value={kind}>
              {walletLabels[kind]}
            </option>
          ))}
        </styled.select>
      </styled.label>
      <styled.label display="flex" flexDirection="column" gap="space.01">
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Network result
        </styled.span>
        <styled.select
          {...selectStyles}
          value={networkResult}
          onChange={event => {
            const result = networkResultSchema.safeParse(event.target.value).data;
            if (result) onNetworkResult(result);
          }}
        >
          {networkResults.map(result => (
            <option key={result} value={result}>
              {networkResultLabels[result]}
            </option>
          ))}
        </styled.select>
      </styled.label>
      <Flex direction="column" gap="space.01">
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Fresh tester link
        </styled.span>
        <Flex gap="space.02">
          <styled.input
            readOnly
            value={testerLink}
            aria-label="Fresh tester link"
            flex={1}
            minWidth={0}
            textStyle="caption.01"
            px="space.02"
            borderRadius="sm"
            borderWidth="1px"
            borderStyle="solid"
            borderColor="ink.border-default"
            bg="ink.background-secondary"
            color="ink.text-primary"
          />
          <Button size="sm" onClick={clipboard.onCopy}>
            {clipboard.hasCopied ? 'Copied' : 'Copy'}
          </Button>
        </Flex>
      </Flex>
      <styled.p textStyle="caption.01" color="ink.text-subdued">
        Run {run.runId} · revision {run.revision}
      </styled.p>
    </Flex>
  );
}
