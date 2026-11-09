import { useCallback, useEffect, useState } from 'react';

import type { BiometricUnlockContext, BiometricUnlockFailureCategory } from '@leather.io/analytics';

import {
  doesFailureSuppressAutoPrompt,
  suppressBiometricAutoPrompt,
} from '@shared/biometric-unlock/biometric-auto-prompt';
import { getBiometricUnlockFailureCategory } from '@shared/biometric-unlock/biometric-unlock-error';
import {
  type PlatformUnlockAvailability,
  getPlatformUnlockAvailability,
} from '@shared/biometric-unlock/platform-authenticator';
import { analytics } from '@shared/utils/analytics';

export function useBiometricUnlockAvailability() {
  const [availability, setAvailability] = useState<PlatformUnlockAvailability | 'checking'>(
    'checking'
  );

  useEffect(() => {
    let isMounted = true;
    async function loadAvailability() {
      const result = await getPlatformUnlockAvailability();
      if (isMounted) setAvailability(result);
    }
    void loadAvailability();
    return () => {
      isMounted = false;
    };
  }, []);

  return availability;
}

type BiometricUnlockAttemptTrigger = 'automatic' | 'manual';

interface UseBiometricUnlockAttemptArgs {
  context: BiometricUnlockContext;
  authenticate(): Promise<void>;
  onSuccess(): void;
}
export function useBiometricUnlockAttempt({
  context,
  authenticate,
  onSuccess,
}: UseBiometricUnlockAttemptArgs) {
  const [isRunning, setIsRunning] = useState(false);
  const [failureCategory, setFailureCategory] = useState<BiometricUnlockFailureCategory | null>(
    null
  );

  const attempt = useCallback(
    async (trigger: BiometricUnlockAttemptTrigger) => {
      const startTimeMs = performance.now();
      analytics.track('biometric_unlock_attempt_started', { context, trigger });
      setIsRunning(true);
      setFailureCategory(null);
      try {
        await authenticate();
        analytics.track('biometric_unlock_attempt_completed', {
          context,
          durationMs: performance.now() - startTimeMs,
        });
        setIsRunning(false);
        onSuccess();
      } catch (error) {
        const category = getBiometricUnlockFailureCategory(error);
        if (category === 'canceled') {
          analytics.track('biometric_unlock_attempt_canceled', { context });
        } else {
          analytics.track('biometric_unlock_attempt_failed', { context, category });
        }
        if (doesFailureSuppressAutoPrompt(category)) await suppressBiometricAutoPrompt();
        setFailureCategory(category);
        setIsRunning(false);
      }
    },
    [authenticate, context, onSuccess]
  );

  return { attempt, isRunning, failureCategory };
}
