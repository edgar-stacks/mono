import { type ReactNode } from 'react';

import { Flex, Stack, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import { useExplorationParams } from './exploration-params';

interface ClickThroughStep {
  id: string;
  label: string;
  render(controls: ClickThroughControls): ReactNode;
}

interface ClickThroughControls {
  next(): void;
  back(): void;
  restart(): void;
}

interface ClickThroughProps {
  steps: ClickThroughStep[];
}

export function ClickThrough({ steps }: ClickThroughProps) {
  const { params, update } = useExplorationParams();
  const index = Math.min(params.step, steps.length - 1);
  const step = steps[index];

  function goTo(nextIndex: number) {
    update({ step: nextIndex > 0 ? String(nextIndex) : null });
  }

  const controls: ClickThroughControls = {
    next() {
      goTo(Math.min(index + 1, steps.length - 1));
    },
    back() {
      goTo(Math.max(index - 1, 0));
    },
    restart() {
      goTo(0);
    },
  };

  if (!step) return null;

  return (
    <Stack gap="space.03">
      <Flex alignItems="center" gap="space.03">
        <styled.span textStyle="label.03" color="ink.text-subdued">
          Step {index + 1} of {steps.length}: {step.label}
        </styled.span>
        <Button variant="ghost" size="sm" disabled={index === 0} onClick={controls.back}>
          Back
        </Button>
        <Button variant="ghost" size="sm" onClick={controls.restart}>
          Restart
        </Button>
      </Flex>
      {step.render(controls)}
    </Stack>
  );
}
