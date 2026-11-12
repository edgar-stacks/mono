import { useEffect } from 'react';

import { setAnalyticsNetwork } from '@/store/analytics';
import { useSettings } from '@/store/settings/settings';

export function useUpdateAnalyticsPlugin() {
  const { networkPreference } = useSettings();
  const networkMode = networkPreference.chain.bitcoin.mode;

  useEffect(() => {
    setAnalyticsNetwork(networkMode);
  }, [networkMode]);
}
