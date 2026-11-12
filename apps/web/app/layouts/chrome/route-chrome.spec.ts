import { routeHidesChrome } from './route-chrome';

describe(routeHidesChrome.name, () => {
  it('hides chrome for routes that opt out', () => {
    expect(routeHidesChrome({ chrome: 'none' })).toBe(true);
  });

  it.each([undefined, null, 'none', {}, { chrome: 'full' }])('keeps chrome for %j', handle => {
    expect(routeHidesChrome(handle)).toBe(false);
  });
});
