import { useKeyActions } from '@app/common/hooks/use-key-actions';
import { RequestPassword } from '@app/components/request-password';
import { useSoftwareKeyAuthenticationMode } from '@app/store/software-keys/software-key.selectors';

import { BiometricUnlockPrompt } from './biometric-unlock-prompt';

const biometricCaption = 'Use your configured unlock method to continue.';

const biometricTitles = {
  unlock: 'Unlock Leather',
  'view-secret-key': "Confirm it's you to view your Secret Key",
} as const;

interface WalletAuthenticationPromptProps {
  context: keyof typeof biometricTitles;
  onSuccess(): void;
}
export function WalletAuthenticationPrompt({
  context,
  onSuccess,
}: WalletAuthenticationPromptProps) {
  const mode = useSoftwareKeyAuthenticationMode();
  const { unlockWalletWithBiometrics } = useKeyActions();

  if (mode !== 'biometric-only') return <RequestPassword onSuccess={onSuccess} />;

  return (
    <BiometricUnlockPrompt
      context={context}
      title={biometricTitles[context]}
      caption={biometricCaption}
      autoPrompt={context === 'unlock'}
      authenticate={async () => {
        await unlockWalletWithBiometrics();
      }}
      onSuccess={onSuccess}
    />
  );
}
