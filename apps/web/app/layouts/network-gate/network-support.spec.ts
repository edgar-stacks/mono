import { routeSupportsNetwork } from './network-support';

describe(routeSupportsNetwork.name, () => {
  it('supports every route on mainnet', () => {
    expect(routeSupportsNetwork('/staking', 'mainnet')).toBe(true);
    expect(routeSupportsNetwork('/portfolio', 'mainnet')).toBe(true);
  });

  it.each([
    '/',
    '/apps',
    '/developers',
    '/news',
    '/explorer',
    '/posts',
    '/posts/what-is-stacks',
    '/support',
    '/support/install-leather',
    '/changelog',
    '/changelog/some-entry',
    '/multisig',
    '/multisig/vault/1',
  ])('supports %s on testnet', pathname => {
    expect(routeSupportsNetwork(pathname, 'testnet')).toBe(true);
  });

  it.each(['/staking', '/portfolio', '/sbtc', '/postsx', '/apps-extra'])(
    'gates %s on testnet',
    pathname => {
      expect(routeSupportsNetwork(pathname, 'testnet')).toBe(false);
    }
  );
});
