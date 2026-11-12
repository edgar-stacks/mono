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
    '/changelog/web-portfolio',
  ])('supports marketing and content path %s on testnet', pathname => {
    expect(routeSupportsNetwork(pathname, 'testnet')).toBe(true);
  });

  it('supports multisig on testnet', () => {
    expect(routeSupportsNetwork('/multisig', 'testnet')).toBe(true);
    expect(routeSupportsNetwork('/multisig/vault/1', 'testnet')).toBe(true);
  });

  it.each(['/staking', '/sbtc', '/portfolio', '/appsx', '/newsletter'])(
    'gates mainnet-only path %s on testnet',
    pathname => {
      expect(routeSupportsNetwork(pathname, 'testnet')).toBe(false);
    }
  );
});
