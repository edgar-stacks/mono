import { type ReactNode, useEffect, useState } from 'react';

import { Grid, styled } from 'leather-styles/jsx';

import { Button, SkeletonLoader } from '@leather.io/ui';

import { mockSecretKey } from '../compliance-shared/compliance-content';
import {
  FooterActions,
  ScreenLayout,
  ScreenTitle,
} from '../compliance-shared/compliance-screen-parts';
import { LockoutScreen } from '../compliance-shared/compliance-screens';
import { useScreening } from './compliance-demo-screens';

const formHoldMs = 1500;

interface RestoreScreenProps {
  onWhy(): void;
  onDispute(): void;
}

function RestoreScreening({ onWhy, onDispute }: RestoreScreenProps) {
  const { verdict } = useScreening('flagged');

  if (verdict !== 'screening') return <LockoutScreen onWhy={onWhy} onDispute={onDispute} />;

  return (
    <RestoreForm
      footer={
        <FooterActions>
          <SkeletonLoader isLoading width="100%" height="48px" borderRadius="round" />
        </FooterActions>
      }
    />
  );
}

interface RestoreFormProps {
  footer: ReactNode;
}

function RestoreForm({ footer }: RestoreFormProps) {
  return (
    <ScreenLayout footer={footer}>
      <ScreenTitle title="Restore wallet" caption="Enter your Secret Key to restore a wallet." />
      <Grid gridTemplateColumns="repeat(3, 1fr)" gap="space.02">
        {mockSecretKey.map((word, index) => (
          <styled.span
            key={`${index}-${word}`}
            textStyle="label.03"
            px="space.02"
            py="space.02"
            borderRadius="xs"
            borderWidth={1}
            borderColor="ink.border-default"
          >
            {index + 1}. {word}
          </styled.span>
        ))}
      </Grid>
    </ScreenLayout>
  );
}

export function RestoreScreen({ onWhy, onDispute }: RestoreScreenProps) {
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSubmitted(true), formHoldMs);
    return () => window.clearTimeout(timer);
  }, []);

  if (submitted) return <RestoreScreening onWhy={onWhy} onDispute={onDispute} />;

  return (
    <RestoreForm
      footer={
        <FooterActions>
          <Button size="lg" variant="solid" flex={1} onClick={() => setSubmitted(true)}>
            Continue
          </Button>
        </FooterActions>
      }
    />
  );
}
