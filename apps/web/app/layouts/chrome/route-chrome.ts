export interface RouteChromeHandle {
  chrome: 'none';
}

export function routeHidesChrome(handle: unknown) {
  return (
    typeof handle === 'object' && handle !== null && 'chrome' in handle && handle.chrome === 'none'
  );
}
