import type { StacksNetworkName } from '@stacks/network';

// Path prefixes that work on non-mainnet networks. Everything else is treated as
// mainnet-only and gets gated when the app is switched to testnet. Add a prefix
// here as each area gains testnet support.
const nonMainnetRoutePrefixes = [
  '/multisig',
  '/apps',
  '/developers',
  '/news',
  '/explorer',
  '/posts',
  '/support',
  '/changelog',
];

const nonMainnetExactRoutes = ['/'];

export function routeSupportsNetwork(pathname: string, networkName: StacksNetworkName): boolean {
  if (networkName === 'mainnet') return true;
  if (nonMainnetExactRoutes.includes(pathname)) return true;
  return nonMainnetRoutePrefixes.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
