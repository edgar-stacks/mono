import { useState } from 'react';

import { SettingsSelectors } from '@tests/selectors/settings.selectors';

import { Link } from '@leather.io/ui';

import { SignOut } from '@app/features/settings/sign-out/sign-out-confirm';

export function BiometricRecoveryLink() {
  const [showSignOut, setShowSignOut] = useState(false);

  return (
    <>
      <Link
        data-testid={SettingsSelectors.BiometricRecoveryLink}
        onClick={() => setShowSignOut(true)}
        textStyle="label.03"
        width="fit-content"
        variant="text"
      >
        Can't use biometrics?
      </Link>
      {showSignOut && <SignOut onClose={() => setShowSignOut(false)} />}
    </>
  );
}
