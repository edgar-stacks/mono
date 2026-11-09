import type { ConsoleAllowRule } from '@leather.io/tools/console-verdict';

export const verifyConsoleAllowlist: readonly ConsoleAllowRule[] = [
  {
    pattern: /^Failed to load resource: net::ERR_FAILED/,
    reason: 'mockUnhandledRequests aborts every request no mock answers',
  },
  {
    pattern:
      /^Failed to load resource: the server responded with a status of 404 \(Not Found\) \(https:\/\/[^/]*api\.leather\.io\/v1\/tokens\/sip10s\//,
    reason: 'mockLeatherApiRequests answers 404 for SIP-10 tokens it has no metadata for',
  },
  {
    pattern: /^Error: <svg> attribute height: Expected length, "auto"\./,
    reason: 'an SVG with height="auto" on the get-started screen; cosmetic, raised before sign-in',
  },
  {
    pattern: /^Failed to load resource: net::ERR_CONNECTION_REFUSED \(http:\/\/localhost:3999\//,
    reason: 'the network list probes the local devnet node, which no verify run starts',
  },
];
