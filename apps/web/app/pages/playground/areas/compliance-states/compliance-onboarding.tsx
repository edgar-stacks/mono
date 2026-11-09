import { useEffect, useState } from 'react';

import { Flex, Grid, Stack, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import {
  complianceScreeningDurationMs,
  mockSecretKey,
} from '../compliance-shared/compliance-content';
import { ScreenShell } from '../compliance-shared/compliance-screen-parts';

interface RestoreWalletScreenProps {
  onRestored(): void;
}

export function RestoreWalletScreen({ onRestored }: RestoreWalletScreenProps) {
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (!isRestoring) return;
    const timeout = setTimeout(onRestored, complianceScreeningDurationMs);
    return () => clearTimeout(timeout);
  }, [isRestoring, onRestored]);

  return (
    <ScreenShell
      footer={
        <Button fullWidth aria-busy={isRestoring} onClick={() => setIsRestoring(true)}>
          Continue
        </Button>
      }
    >
      <Stack gap="space.03">
        <styled.h2 textStyle="heading.04">Enter your Secret Key</styled.h2>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          Mock 12-word key, already filled in.
        </styled.p>
      </Stack>
      <Grid gridTemplateColumns="repeat(2, minmax(0, 1fr))" gap="space.02">
        {mockSecretKey.map((word, index) => (
          <Flex
            key={word}
            gap="space.02"
            px="space.03"
            py="space.02"
            borderWidth={1}
            borderColor="ink.border-default"
            borderRadius="sm"
          >
            <styled.span textStyle="label.03" color="ink.text-subdued">
              {index + 1}
            </styled.span>
            <styled.span textStyle="label.03">{word}</styled.span>
          </Flex>
        ))}
      </Grid>
    </ScreenShell>
  );
}
