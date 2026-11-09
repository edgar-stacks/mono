import { type UIMatch, useMatches } from 'react-router';

const noChrome = 'none';

function hasNoChrome({ handle }: UIMatch) {
  return typeof handle === 'object' && handle !== null && 'chrome' in handle
    ? handle.chrome === noChrome
    : false;
}

export function useRouteHidesChrome() {
  return useMatches().some(hasNoChrome);
}
