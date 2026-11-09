import { useRouteState } from '@app/common/hooks/use-route-state';

import { stacksConfirmationRouteStateSchema } from '../../hooks/use-send-form-navigate';
import { StacksSendFormConfirmation } from '../stacks/stacks-send-form-confirmation';
import { SbtcSponsoredSendFormConfirmation } from './sbtc-sponsored-send-form-confirmation';

export function Sip10SendFormConfirmation() {
  const routeState = useRouteState(stacksConfirmationRouteStateSchema);
  if (routeState.sponsorship)
    return (
      <SbtcSponsoredSendFormConfirmation
        routeState={routeState}
        sponsorship={routeState.sponsorship}
      />
    );
  return <StacksSendFormConfirmation />;
}
