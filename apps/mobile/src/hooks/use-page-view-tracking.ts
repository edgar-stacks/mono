import { useEffect } from 'react';

import { analytics } from '@/store/analytics';
import { useGlobalSearchParams, usePathname } from 'expo-router';

export function usePageViewTracking() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  useEffect(() => {
    analytics?.screen(pathname, {
      params,
    });
  }, [pathname, params]);
}
