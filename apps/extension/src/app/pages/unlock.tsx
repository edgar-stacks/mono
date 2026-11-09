import { Outlet, useNavigate } from 'react-router';

import { z } from 'zod';

import { useRouteState } from '@app/common/hooks/use-route-state';
import { whenPageMode } from '@app/common/utils';
import { Content } from '@app/components/layout';
import { UnlockHeader } from '@app/features/container/headers/unlock.header';
import { WalletAuthenticationPrompt } from '@app/features/wallet-authentication/wallet-authentication-prompt';

const unlockRouteStateSchema = z.object({ from: z.string().optional() }).nullish();

export function Unlock() {
  const navigate = useNavigate();
  const routeState = useRouteState(unlockRouteStateSchema);
  // Here we want to return to the previous route. The user could land on any
  // page when the wallet is locked, so we can't assume as single route.
  function returnToPreviousRoute() {
    return whenPageMode({
      full: () => void navigate(routeState?.from || '/'),
      popup: () => void navigate(-1),
    })();
  }

  return (
    <>
      <UnlockHeader />
      <Content>
        <WalletAuthenticationPrompt context="unlock" onSuccess={returnToPreviousRoute} />
        <Outlet />
      </Content>
    </>
  );
}
