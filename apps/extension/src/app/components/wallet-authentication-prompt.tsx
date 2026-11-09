import { useCallback } from 'react';

import { Box, Stack, styled } from 'leather-styles/jsx';

import { Logo } from '@leather.io/ui';

import { claimBiometricAutoPrompt } from '@app/common/biometric-unlock/biometric-auto-prompt';
import { useKeyActions } from '@app/common/hooks/use-key-actions';
import { Card, Page } from '@app/components/layout';
import { useIsBiometricOnlyProfile } from '@app/store/software-keys/software-key.selectors';

import { BiometricConfirmation } from './biometric-confirmation';
import { RequestPassword } from './request-password';

const biometricCaption = 'Use your configured unlock method to continue.';

function shouldAutoPromptBiometricUnlock() {
  return claimBiometricAutoPrompt(true);
}

interface WalletAuthenticationPromptProps {
  biometricTitle: string;
  autoPromptBiometrics?: boolean;
  onSuccess(): void;
}
export function WalletAuthenticationPrompt({
  biometricTitle,
  autoPromptBiometrics = false,
  onSuccess,
}: WalletAuthenticationPromptProps) {
  const isBiometricOnly = useIsBiometricOnlyProfile();
  const { unlockWalletWithBiometrics } = useKeyActions();
  const confirm = useCallback(() => unlockWalletWithBiometrics(), [unlockWalletWithBiometrics]);

  if (!isBiometricOnly) return <RequestPassword onSuccess={onSuccess} />;

  return (
    <Page>
      <Card
        contentStyle={{ p: 'space.00' }}
        header={
          <styled.h1 p="space.04" hideBelow="sm">
            <Box px="space.02">
              <Logo />
            </Box>
          </styled.h1>
        }
      >
        <Stack gap="space.05" px="space.05" pb="space.05" minHeight="330px">
          <styled.h3 textStyle="heading.03">{biometricTitle}</styled.h3>
          <BiometricConfirmation
            caption={biometricCaption}
            confirm={confirm}
            onSuccess={onSuccess}
            shouldAutoPrompt={autoPromptBiometrics ? shouldAutoPromptBiometricUnlock : undefined}
          />
        </Stack>
      </Card>
    </Page>
  );
}
