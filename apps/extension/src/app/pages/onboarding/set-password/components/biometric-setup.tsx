import { useEffect, useState } from 'react';

import { OnboardingSelectors } from '@tests/selectors/onboarding.selectors';
import { Flex, Stack, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import {
  getPlatformUnlockFailureCategory,
  isPlatformUnlockAvailable,
} from '@shared/crypto/platform-authenticator';
import { analytics } from '@shared/utils/analytics';

import { ErrorLabel } from '@app/components/error-label';

const unavailableMessage = "Biometric unlock isn't available in this browser context.";
const enrollmentFailedMessage =
  'Biometric unlock could not be set up. Try again or continue with a password.';
const passkeyLocationMessage =
  "The passkey provider you chose doesn't support biometric unlock. Save the passkey on this device instead, or continue with a password.";

type Availability = 'checking' | 'available' | 'unavailable';

interface BiometricSetupProps {
  label: string;
  isDisabled: boolean;
  onBusyChange(isBusy: boolean): void;
  onEnroll(): Promise<void>;
}
export function BiometricSetup({ label, isDisabled, onBusyChange, onEnroll }: BiometricSetupProps) {
  const [availability, setAvailability] = useState<Availability>('checking');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function checkAvailability() {
      const isAvailable = await isPlatformUnlockAvailable();
      if (isMounted) setAvailability(isAvailable ? 'available' : 'unavailable');
    }
    void checkAvailability();
    return () => {
      isMounted = false;
    };
  }, []);

  async function enroll() {
    setError('');
    setIsEnrolling(true);
    onBusyChange(true);
    analytics.track('biometric_unlock_enrollment_started');
    try {
      await onEnroll();
      analytics.track('biometric_unlock_enrollment_completed');
    } catch (e) {
      const category = getPlatformUnlockFailureCategory(e);
      analytics.track('biometric_unlock_enrollment_failed', { category });
      setError(category === 'no-prf' ? passkeyLocationMessage : enrollmentFailedMessage);
    } finally {
      setIsEnrolling(false);
      onBusyChange(false);
    }
  }

  return (
    <Stack gap="space.04">
      <Flex alignItems="center" gap="space.03">
        <styled.hr flex="1" borderColor="ink.border-default" />
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          or
        </styled.span>
        <styled.hr flex="1" borderColor="ink.border-default" />
      </Flex>
      <Button
        data-testid={OnboardingSelectors.BiometricSetupBtn}
        type="button"
        variant="outline"
        disabled={isDisabled || isEnrolling || availability !== 'available'}
        aria-busy={isEnrolling}
        onClick={() => void enroll()}
      >
        {label}
      </Button>
      {availability === 'unavailable' && (
        <styled.p textStyle="caption.01" color="ink.text-subdued">
          {unavailableMessage}
        </styled.p>
      )}
      {error && <ErrorLabel>{error}</ErrorLabel>}
    </Stack>
  );
}
