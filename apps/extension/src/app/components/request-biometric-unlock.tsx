import { useEffect, useState } from 'react';

import { SettingsSelectors } from '@tests/selectors/settings.selectors';
import { Box, Stack, styled } from 'leather-styles/jsx';

import { Button, Link, Logo } from '@leather.io/ui';

import { claimAutomaticPrompt } from '@app/common/biometric-unlock/biometric-auto-prompt';
import { useBiometricUnlockAttempt } from '@app/common/biometric-unlock/use-biometric-unlock-attempt';
import { Card, Page } from '@app/components/layout';

const recoveryHelp =
  'Sign out from the menu, then sign back in with your Secret Key to choose a new unlock method.';

interface RequestBiometricUnlockProps {
  title: string;
  description: string;
  isActionPopup?: boolean;
  authenticate(): Promise<void>;
  onSuccess(): void;
}
export function RequestBiometricUnlock({
  title,
  description,
  isActionPopup = false,
  authenticate,
  onSuccess,
}: RequestBiometricUnlockProps) {
  const [showRecoveryHelp, setShowRecoveryHelp] = useState(false);
  const { attempt, isRunning, hasFailed } = useBiometricUnlockAttempt({
    authenticate,
    onSuccess,
  });

  useEffect(() => {
    async function promptAutomatically() {
      if (await claimAutomaticPrompt({ isActionPopup })) await attempt();
    }
    void promptAutomatically();
  }, [attempt, isActionPopup]);

  return (
    <Page>
      <Card
        contentStyle={{
          p: 'space.00',
        }}
        header={
          <styled.h1 p="space.04" hideBelow="sm">
            <Box px="space.02">
              <Logo />
            </Box>
          </styled.h1>
        }
        footer={
          <Button
            data-testid={SettingsSelectors.BiometricUnlockBtn}
            disabled={isRunning}
            aria-busy={isRunning}
            onClick={() => void attempt()}
            variant="solid"
            fullWidth
          >
            {hasFailed ? 'Try biometric unlock again' : 'Unlock with biometrics'}
          </Button>
        }
      >
        <Stack gap="space.05" px="space.05" minHeight="330px">
          <styled.h3 textStyle="heading.03">{title}</styled.h3>
          <styled.p textStyle="label.02">{description}</styled.p>
          <Box>
            <Link
              data-testid={SettingsSelectors.BiometricRecoveryLink}
              onClick={() => setShowRecoveryHelp(true)}
            >
              Can't use biometrics?
            </Link>
          </Box>
          {showRecoveryHelp && <styled.p textStyle="caption.01">{recoveryHelp}</styled.p>}
        </Stack>
      </Card>
    </Page>
  );
}
