import { type ReactNode, useEffect, useState } from 'react';

import { Flex, Stack, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import { ExtensionFrame } from '../compliance-shared/compliance-frames';
import { type WalkthroughState, walkthroughStates } from './compliance-states-list';

interface StateFrameProps {
  state: WalkthroughState;
  children: ReactNode;
}

function StateFrame({ state, children }: StateFrameProps) {
  if (state.frame === 'mail') return children;
  return <ExtensionFrame kind={state.frame}>{children}</ExtensionFrame>;
}

function wrapIndex(index: number) {
  return (index + walkthroughStates.length) % walkthroughStates.length;
}

export function ComplianceStatesPage() {
  const [index, setIndex] = useState(0);
  const [visit, setVisit] = useState(0);
  const [playing, setPlaying] = useState(true);
  const current = walkthroughStates[index];
  const durationMs = current?.durationMs;

  function show(nextIndex: number) {
    setIndex(wrapIndex(nextIndex));
    setVisit(count => count + 1);
  }

  function goTo(id: string) {
    const nextIndex = walkthroughStates.findIndex(state => state.id === id);
    if (nextIndex === -1) return;
    setPlaying(false);
    show(nextIndex);
  }

  useEffect(() => {
    if (!playing || !durationMs) return;
    const timer = setTimeout(() => {
      setIndex(currentIndex => wrapIndex(currentIndex + 1));
      setVisit(count => count + 1);
    }, durationMs);
    return () => clearTimeout(timer);
  }, [playing, visit, durationMs]);

  if (!current) return null;

  return (
    <Flex gap="space.07" p="space.07" pb="space.11" minHeight="100vh" alignItems="flex-start">
      <Stack gap="space.04" width="320px" flexShrink={0}>
        <Stack gap="space.02">
          <styled.h1 textStyle="heading.04">Compliance gate walkthrough</styled.h1>
          <styled.p textStyle="caption.01" color="ink.text-subdued">
            A timed, clickable walkthrough of the compliance screens, rendering the same shared
            screens as /playground/compliance-ui. Screening lasts 1.6 s.
          </styled.p>
        </Stack>
        <Flex gap="space.02">
          <Button size="sm" variant="outline" onClick={() => show(index - 1)}>
            Previous
          </Button>
          <Button size="sm" onClick={() => setPlaying(value => !value)}>
            {playing ? 'Pause' : 'Play'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => show(index + 1)}>
            Next
          </Button>
        </Flex>
        <Stack gap="space.01" as="ol">
          {walkthroughStates.map((state, stateIndex) => (
            <li key={state.id}>
              <styled.button
                type="button"
                onClick={() => goTo(state.id)}
                display="flex"
                gap="space.03"
                width="100%"
                textAlign="left"
                px="space.03"
                py="space.02"
                borderRadius="sm"
                cursor="pointer"
                bg={stateIndex === index ? 'ink.component-background-default' : 'transparent'}
                _hover={{ bg: 'ink.component-background-hover' }}
              >
                <styled.span textStyle="caption.02" color="ink.text-subdued" width="36px">
                  {state.scenario}
                </styled.span>
                <styled.span textStyle="label.03">{state.title}</styled.span>
              </styled.button>
            </li>
          ))}
        </Stack>
      </Stack>

      <Stack gap="space.04" flex={1} alignItems="center">
        <Stack gap="space.01" maxWidth="60ch" textAlign="center">
          <styled.span textStyle="label.01">
            {current.scenario} · {current.title}
          </styled.span>
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            {current.note}
          </styled.span>
        </Stack>
        <StateFrame state={current}>
          <Flex key={`${current.id}-${visit}`} direction="column" flex={1} minHeight={0}>
            {current.render({ goTo, next: () => show(index + 1) })}
          </Flex>
        </StateFrame>
      </Stack>
    </Flex>
  );
}
