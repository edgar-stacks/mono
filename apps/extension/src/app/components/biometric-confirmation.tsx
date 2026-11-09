import { useCallback, useEffect, useRef, useState } from 'react';

import { SettingsSelectors } from '@tests/selectors/settings.selectors';
import { Stack, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import { getBiometricUnlockFailureCategory } from '@shared/crypto/platform-authenticator';

import {
  getBiometricUnlockButtonLabel,
  getBiometricUnlockErrorMessage,
} from '@app/common/biometric-unlock/biometric-unlock-messages';

import { BiometricRecoveryLink } from './biometric-recovery-link';
import { ErrorLabel } from './error-label';

interface BiometricConfirmationProps {
  caption: string;
  confirm(): Promise<void> | void;
  onSuccess(): void;
  shouldAutoPrompt?(): Promise<boolean>;
}
export function BiometricConfirmation({
  caption,
  confirm,
  onSuccess,
  shouldAutoPrompt,
}: BiometricConfirmationProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [error, setError] = useState('');
  const isRunningRef = useRef(false);
  const hasCheckedAutoPromptRef = useRef(false);

  const submit = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setIsRunning(true);
    setError('');
    try {
      await confirm();
      onSuccess();
    } catch (e) {
      setHasFailed(true);
      setError(getBiometricUnlockErrorMessage(getBiometricUnlockFailureCategory(e)));
    } finally {
      isRunningRef.current = false;
      setIsRunning(false);
    }
  }, [confirm, onSuccess]);

  useEffect(() => {
    if (!shouldAutoPrompt || hasCheckedAutoPromptRef.current) return;
    hasCheckedAutoPromptRef.current = true;
    const checkAutoPrompt = shouldAutoPrompt;
    async function autoPrompt() {
      if (await checkAutoPrompt()) await submit();
    }
    void autoPrompt();
  }, [shouldAutoPrompt, submit]);

  return (
    <Stack gap="space.05">
      <styled.p textStyle="label.02">{caption}</styled.p>
      <Button
        data-testid={SettingsSelectors.BiometricUnlockBtn}
        disabled={isRunning}
        aria-busy={isRunning}
        onClick={() => void submit()}
        variant="solid"
        fullWidth
      >
        {getBiometricUnlockButtonLabel(hasFailed)}
      </Button>
      {error && (
        <ErrorLabel data-testid={SettingsSelectors.BiometricUnlockError} width="100%">
          {error}
        </ErrorLabel>
      )}
      <BiometricRecoveryLink />
    </Stack>
  );
}
