import { useNavigate } from 'react-router';

import { z } from 'zod';

import { RouteUrls } from '@shared/route-urls';

import { useRouteState } from '@app/common/hooks/use-route-state';

const transactionActionReturnRouteStateSchema = z
  .object({ returnTo: z.string().startsWith('/').optional().catch(undefined) })
  .nullish()
  .catch(null);

export function useCloseTransactionAction() {
  const navigate = useNavigate();
  const returnTo =
    useRouteState(transactionActionReturnRouteStateSchema)?.returnTo ?? RouteUrls.Home;
  return () => void navigate(returnTo);
}
