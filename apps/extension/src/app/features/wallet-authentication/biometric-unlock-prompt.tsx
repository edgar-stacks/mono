import { useEffect, useRef, useState } from 'react';

import { OnboardingSelectors } from '@tests/selectors/onboarding.selectors';
import { Box, Stack, styled } from 'leather-styles/jsx';

import type { BiometricUnlockContext, BiometricUnlockFailureCategory } from '@leather.io/analytics';
import { Button, Link, Logo } from '@leather.io/ui';

import { isCurrentWindowActionPopup } from '@shared/biometric-unlock/action-popup-classifier';
import {
  claimBiometricAutoPrompt,
  isBiometricAutoPromptSuppressed,
} from '@shared/biometric-unlock/biometric-auto-prompt';

import { useBiometricUnlockAttempt } from '@app/common/hooks/use-biometric-unlock';
import { ErrorLabel } from '@app/components/error-label';
import { Card, Page } from '@app/components/layout';
import { SignOut } from '@app/features/settings/sign-out/sign-out-confirm';

const failureMessages: Record<BiometricUnlockFailureCategory, string> = {
  canceled: 'Biometric unlock was canceled.',
  'credential-mismatch': "This passkey doesn't match the one set up for Leather.",
  'invalid-config': "Leather couldn't read its biometric unlock settings.",
  'no-prf': "The selected passkey can't be used to unlock Leather.",
  unavailable: "Biometric unlock isn't available in this browser context.",
  unknown: 'Biometric unlock failed.',
  'wallet-validation': "Leather couldn't verify your wallets with biometric unlock.",
};

interface BiometricUnlockPromptProps {
  context: BiometricUnlockContext;
  title: string;
  caption: string;
  autoPrompt?: boolean;
  authenticate(): Promise<void>;
  onSuccess(): void;
}
export function BiometricUnlockPrompt({
  context,
  title,
  caption,
  autoPrompt = false,
  authenticate,
  onSuccess,
}: BiometricUnlockPromptProps) {
  const [showSignOut, setShowSignOut] = useState(false);
  const { attempt, isRunning, failureCategory } = useBiometricUnlockAttempt({
    context,
    authenticate,
    onSuccess,
  });

  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;

  useEffect(() => {
    if (!autoPrompt) return;
    async function promptAutomatically() {
      const isSuppressed = await isBiometricAutoPromptSuppressed();
      if (claimBiometricAutoPrompt(isCurrentWindowActionPopup(), isSuppressed))
        await attemptRef.current('automatic');
    }
    void promptAutomatically();
  }, [autoPrompt]);

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
            data-testid={OnboardingSelectors.BiometricUnlockBtn}
            disabled={isRunning}
            aria-busy={isRunning}
            onClick={() => void attempt('manual')}
            variant="solid"
            fullWidth
          >
            {failureCategory ? 'Try biometric unlock again' : 'Unlock with biometrics'}
          </Button>
        }
      >
        <Stack gap="space.05" px="space.05" minHeight="330px">
          <styled.h3 textStyle="heading.03">{title}</styled.h3>
          <styled.p textStyle="label.02">{caption}</styled.p>
          {failureCategory && (
            <ErrorLabel width="100%">{failureMessages[failureCategory]}</ErrorLabel>
          )}
          <Link
            data-testid={OnboardingSelectors.BiometricRecoveryLink}
            onClick={() => setShowSignOut(true)}
            textStyle="label.03"
            width="fit-content"
            variant="text"
          >
            Can't use biometrics?
          </Link>
        </Stack>
      </Card>
      {showSignOut && <SignOut onClose={() => setShowSignOut(false)} />}
    </Page>
  );
}
