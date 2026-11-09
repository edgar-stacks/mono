import { useMatches } from 'react-router';

export interface RouteChromeHandle {
  chrome: 'none';
}

function hasNoChrome(handle: unknown) {
  return (
    typeof handle === 'object' && handle !== null && 'chrome' in handle && handle.chrome === 'none'
  );
}

export function useRouteHasChrome() {
  const matches = useMatches();
  return !matches.some(match => hasNoChrome(match.handle));
}
