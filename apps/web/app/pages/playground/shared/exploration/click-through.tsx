import { type ReactNode } from 'react';

import { Flex, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

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
  step: number;
  onStepChange(step: number): void;
}

export function ClickThrough({ steps, step, onStepChange }: ClickThroughProps) {
  const lastIndex = steps.length - 1;
  const index = Math.min(step, lastIndex);
  const current = steps[index];

  const controls: ClickThroughControls = {
    next() {
      onStepChange(Math.min(index + 1, lastIndex));
    },
    back() {
      onStepChange(Math.max(index - 1, 0));
    },
    restart() {
      onStepChange(0);
    },
  };

  if (!current) return null;

  return (
    <Flex direction="column" gap="space.03">
      <Flex alignItems="center" gap="space.02">
        <Button size="sm" variant="outline" disabled={index === 0} onClick={controls.back}>
          Back
        </Button>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Step {index + 1} of {steps.length}: {current.label}
        </styled.span>
        <Button size="sm" variant="outline" disabled={index === lastIndex} onClick={controls.next}>
          Next
        </Button>
      </Flex>
      {current.render(controls)}
    </Flex>
  );
}
