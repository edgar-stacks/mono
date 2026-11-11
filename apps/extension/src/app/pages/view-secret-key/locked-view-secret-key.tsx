import { useEffect } from 'react';
import { Outlet } from 'react-router';

import { Flex } from 'leather-styles/jsx';

import { analytics } from '@shared/utils/analytics';

import { Content } from '@app/components/layout';
import { Header } from '@app/components/layout/headers/header';
import { HeaderBackButton } from '@app/components/layout/headers/header-back-button';
import { HeaderGrid } from '@app/components/layout/headers/header-grid';
import { WalletAuthenticationPrompt } from '@app/components/wallet-authentication-prompt';

interface LockedViewSecretKeyProps {
  onUnlock(): void;
}
export function LockedViewSecretKey({ onUnlock }: LockedViewSecretKeyProps) {
  useEffect(() => {
    analytics.page('view', '/save-secret-key');
  }, []);

  return (
    <Flex height="100vh" direction="column">
      <Header px="space.04">
        <HeaderGrid leftCol={<HeaderBackButton />} rightCol={null} />
      </Header>
      <Content>
        <WalletAuthenticationPrompt
          biometricTitle="Confirm it's you to view your Secret Key"
          onSuccess={onUnlock}
        />
        <Outlet />
      </Content>
    </Flex>
  );
}
