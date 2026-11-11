import { useCallback } from 'react';

import { useKeyActions } from '@app/common/hooks/use-key-actions';
import { useIsBiometricOnlyProfile } from '@app/store/software-keys/software-key.selectors';

import { RequestBiometricUnlock } from './request-biometric-unlock';
import { RequestPassword } from './request-password';

const biometricUnlockDescription = 'Use your configured unlock method to continue.';

interface WalletAuthenticationPromptProps {
  biometricTitle: string;
  isActionPopup?: boolean;
  onSuccess(): void;
}
export function WalletAuthenticationPrompt({
  biometricTitle,
  isActionPopup,
  onSuccess,
}: WalletAuthenticationPromptProps) {
  const isBiometricOnly = useIsBiometricOnlyProfile();
  const { unlockWalletWithBiometrics } = useKeyActions();
  const authenticate = useCallback(async () => {
    await unlockWalletWithBiometrics();
  }, [unlockWalletWithBiometrics]);

  if (!isBiometricOnly) return <RequestPassword onSuccess={onSuccess} />;

  return (
    <RequestBiometricUnlock
      title={biometricTitle}
      description={biometricUnlockDescription}
      isActionPopup={isActionPopup}
      authenticate={authenticate}
      onSuccess={onSuccess}
    />
  );
}
