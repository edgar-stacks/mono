import { useCallback, useState } from 'react';

import { getPlatformUnlockFailureCategory } from '@shared/crypto/platform-authenticator';
import { analytics } from '@shared/utils/analytics';

import { clearAutomaticPromptSuppression, recordBiometricFailure } from './biometric-auto-prompt';

interface UseBiometricUnlockAttemptArgs {
  authenticate(): Promise<void>;
  onSuccess(): void;
}
export function useBiometricUnlockAttempt({
  authenticate,
  onSuccess,
}: UseBiometricUnlockAttemptArgs) {
  const [isRunning, setIsRunning] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const attempt = useCallback(async () => {
    setIsRunning(true);
    analytics.track('biometric_unlock_attempt_started');
    try {
      await authenticate();
      analytics.track('biometric_unlock_attempt_completed');
      setHasFailed(false);
      await clearAutomaticPromptSuppression().catch(() => undefined);
      onSuccess();
    } catch (error) {
      const category = getPlatformUnlockFailureCategory(error);
      if (category === 'canceled') {
        analytics.track('biometric_unlock_attempt_canceled');
      } else {
        analytics.track('biometric_unlock_attempt_failed', { category });
      }
      await recordBiometricFailure(category).catch(() => undefined);
      setHasFailed(true);
    } finally {
      setIsRunning(false);
    }
  }, [authenticate, onSuccess]);

  return { attempt, isRunning, hasFailed };
}
