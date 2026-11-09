import { useState } from 'react';

import { Box, Flex, HStack, Stack, styled } from 'leather-styles/jsx';

import { Badge, Button, Callout } from '@leather.io/ui';

import { type SponsorshipFlow, sponsorshipFlows } from './sbtc-sponsorship-flows.data';

interface FlowBoardProps {
  flow: SponsorshipFlow;
}
function FlowBoard({ flow }: FlowBoardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = flow.steps[stepIndex];
  const isLastStep = stepIndex === flow.steps.length - 1;

  return (
    <Stack gap="space.04">
      <Stack gap="space.02">
        <styled.h2 textStyle="heading.05">{flow.title}</styled.h2>
        <styled.p color="ink.text-subdued" textStyle="body.02">
          {flow.description}
        </styled.p>
      </Stack>
      <HStack gap="space.02" flexWrap="wrap">
        {flow.steps.map((item, index) => (
          <Button
            key={item.title}
            size="sm"
            variant={index === stepIndex ? 'solid' : 'outline'}
            onClick={() => setStepIndex(index)}
          >
            {item.title}
          </Button>
        ))}
      </HStack>
      <Box
        border="default"
        borderRadius="md"
        maxWidth="392px"
        p="space.05"
        bg="ink.background-primary"
      >
        <Stack gap="space.04">
          <HStack justifyContent="space-between">
            <styled.span textStyle="label.01">{step.title}</styled.span>
            {step.badge && <Badge label={step.badge} variant="info" />}
          </HStack>
          {step.callout && (
            <Callout variant="info" title={step.callout.title}>
              {step.callout.body}
            </Callout>
          )}
          <Stack gap="space.02">
            {step.rows.map(row => (
              <Flex key={row.label} justifyContent="space-between" gap="space.03">
                <styled.span color="ink.text-subdued" textStyle="label.02">
                  {row.label}
                </styled.span>
                <styled.span textAlign="right" textStyle="label.02" wordBreak="break-all">
                  {row.value}
                </styled.span>
              </Flex>
            ))}
          </Stack>
          <Button fullWidth onClick={() => setStepIndex(isLastStep ? 0 : stepIndex + 1)}>
            {step.actionLabel}
          </Button>
        </Stack>
      </Box>
      <styled.p color="ink.text-subdued" textStyle="caption.01" maxWidth="392px">
        {step.caption}
      </styled.p>
    </Stack>
  );
}

export function SbtcSponsorshipFlowsPage() {
  return (
    <Stack gap="space.09" py="space.07">
      <Stack gap="space.02">
        <styled.h1 textStyle="heading.03">sBTC fee sponsorship</styled.h1>
        <styled.p color="ink.text-subdued" textStyle="body.01">
          Click-through mocks of paying network fees in sBTC through the Leather sponsor. Dummy data
          only; nothing here makes a request.
        </styled.p>
      </Stack>
      {sponsorshipFlows.map(flow => (
        <FlowBoard key={flow.id} flow={flow} />
      ))}
    </Stack>
  );
}
