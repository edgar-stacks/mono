import { useEffect, useState } from 'react';

import {
  isPlatformUnlockAvailable,
  isWebAuthnApiPresent,
} from '@shared/crypto/platform-authenticator';

type PlatformUnlockAvailability = 'checking' | 'available' | 'unavailable';

export function usePlatformUnlockAvailability() {
  const [availability, setAvailability] = useState<PlatformUnlockAvailability>('checking');

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

  return { availability, isOffered: isWebAuthnApiPresent() };
}
