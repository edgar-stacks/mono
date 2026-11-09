import type { StacksNetworkName } from '@stacks/network';

// Path prefixes that work on non-mainnet networks. Everything else is treated as
// mainnet-only and gets gated when the app is switched to testnet. Add a prefix
// here as each area gains testnet support.
const nonMainnetRoutePrefixes = ['/multisig'];

const networkAgnosticRoutePrefixes = [
  '/apps',
  '/developers',
  '/news',
  '/explorer',
  '/posts',
  '/support',
  '/changelog',
];

function matchesRoutePrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function routeSupportsNetwork(pathname: string, networkName: StacksNetworkName): boolean {
  if (networkName === 'mainnet') return true;
  if (pathname === '/') return true;
  return matchesRoutePrefix(pathname, [
    ...nonMainnetRoutePrefixes,
    ...networkAgnosticRoutePrefixes,
  ]);
}
