import { useLocation, useNavigate } from 'react-router';

import { RouteUrls } from '@shared/route-urls';

export function useActivityDetailsBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasPreviousScreen = location.key !== 'default';

  return () => {
    if (hasPreviousScreen) return void navigate(-1);
    void navigate(RouteUrls.Activity);
  };
}
