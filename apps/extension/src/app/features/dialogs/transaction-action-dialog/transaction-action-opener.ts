import { useCallback } from 'react';
import { useNavigate } from 'react-router';

import { z } from 'zod';

import { RouteUrls } from '@shared/route-urls';

import { useRouteState } from '@app/common/hooks/use-route-state';

export const transactionActionOpenerState = { returnToOpener: true } as const;

const transactionActionOpenerStateSchema = z
  .object({ returnToOpener: z.boolean().optional().catch(undefined) })
  .nullish()
  .catch(null);

export function useCloseTransactionAction() {
  const navigate = useNavigate();
  const returnToOpener = useRouteState(transactionActionOpenerStateSchema)?.returnToOpener;

  return useCallback(() => {
    if (returnToOpener) return void navigate(-1);
    void navigate(RouteUrls.Home);
  }, [navigate, returnToOpener]);
}
