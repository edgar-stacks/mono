import { deprecationPostPaths } from './shared-redirect-logic';

const retiredContentSlugs = [
  'apps-befi-labs',
  'apps-lockstacks',
  'apps-stx20-com',
  'befi-labs',
  'stx20-com',
  'tokens-btc',
  'tokens-stx-20',
];

const legacyContentTargets = new Map<string, string>([
  ['app-stamp-scan', deprecationPostPaths.stamps],
  ['apps-arkadiko', '/posts/arkadiko'],
  ['apps-bitflow', '/posts/bitflow'],
  ['apps-lisa', '/posts/lisa'],
  ['apps-magic-eden', deprecationPostPaths.ordinals],
  ['apps-matrica', deprecationPostPaths.ordinals],
  ['apps-openstamp', deprecationPostPaths.stamps],
  ['apps-ordinals-wallet', deprecationPostPaths.ordinals],
  ['apps-ordinalsbot', deprecationPostPaths.ordinals],
  ['apps-ordio', deprecationPostPaths.ordinals],
  ['apps-ordzaar', deprecationPostPaths.ordinals],
  ['apps-rune-alpha', deprecationPostPaths.runes],
  ['apps-sordinals', deprecationPostPaths.ordinals],
  ['apps-stacking-dao', '/posts/stacking-dao'],
  ['apps-stackswap', '/posts/stacks-swaps'],
  ['apps-unisat', deprecationPostPaths.ordinals],
  ['apps-velar', '/posts/velar'],
  ['apps-xlink', '/posts/brotocol'],
  ['apps-zest-protocol', '/posts/zest'],
  ['bns-gateway', '/posts/bns'],
  ['bns-hub', '/posts/bns'],
  ['bns-one', '/posts/bns'],
  ['buy-and-sell-decentralized-runes-tokens', deprecationPostPaths.runes],
  ['can-i-inscribe-and-trade-ordinals-with-leather', deprecationPostPaths.ordinals],
  ['can-leather-users-also-conduct-transactions-with-brc-20-tokens', deprecationPostPaths.ordinals],
  ['collections-bitcoin-puppets', deprecationPostPaths.ordinals],
  ['collections-bitcoin-whales', '/posts/building-bitcoin-culture-with-tosyo-of-bitcoinwhales'],
  ['collections-nodemonkes', '/posts/guide-to-bitcoin-ordinals-collections-what-is-nodemonkes'],
  ['collections-quantum-cats', '/posts/guide-to-bitcoin-ordinal-collections-quantum-cats'],
  ['collections-runestones', '/posts/guide-to-ordinal-collections-what-are-runestones'],
  ['collections-taproot-wizards', '/posts/guide-to-ordinal-collections-what-are-taproot-wizards'],
  ['gamma', deprecationPostPaths.ordinals],
  ['getting-started-guide', '/support'],
  ['how-can-i-secure-my-secret-key', '/support/secure-secret-key'],
  ['how-do-i-access-my-leather-account', '/support/lock-and-unlock-wallet'],
  ['how-do-i-buy-tokens-with-leather', '/posts/how-to-buy-bitcoin'],
  ['how-do-i-connect-my-leather-account-to-applications', '/posts/connect-apps'],
  ['how-do-i-install-the-leather-browser-extension', '/support/install-leather'],
  ['how-do-you-receive-assets-via-leather', '/support/receive-assets'],
  ['how-do-you-send-assets-via-leather', '/support/send-bitcoin'],
  ['magic-eden', deprecationPostPaths.ordinals],
  ['matrica', deprecationPostPaths.ordinals],
  ['minimum-commitment-fast-pool', '/posts/stacking-minimum-commitment'],
  ['mobile-crypto-wallet', '/'],
  ['openstamp', deprecationPostPaths.stamps],
  ['ordinals-wallet', deprecationPostPaths.ordinals],
  ['ordinalsbot', deprecationPostPaths.ordinals],
  ['ordio', deprecationPostPaths.ordinals],
  ['ordzaar', deprecationPostPaths.ordinals],
  ['rune-alpha', deprecationPostPaths.runes],
  ['send-stacks-from-app', '/support/send-stx'],
  ['sordinals', deprecationPostPaths.ordinals],
  ['stackswap', '/posts/stacks-swaps'],
  ['stamp-scan', deprecationPostPaths.stamps],
  ['start-with-leather', '/support'],
  ['tokens-brc-20', deprecationPostPaths.ordinals],
  ['tokens-runes', deprecationPostPaths.runes],
  ['tokens-sip-10', '/support/receive-stacks-contract-tokens'],
  ['tokens-src-20', deprecationPostPaths.stamps],
  ['tokens-stx', '/posts/stacks-token-stx'],
  ['unisat', deprecationPostPaths.ordinals],
  ['wallets-comparison', '/posts/custodial-vs-non-custodial-wallet'],
  ['what-about-other-collectibles-like-bitcoin-stamps', deprecationPostPaths.stamps],
  ['what-are-the-system-requirements-for-running-leather', '/support/install-leather'],
  ['what-do-i-do-if-i-ve-lost-my-secret-key', '/posts/recover-secret-key'],
  ['what-is-the-difference-between-a-secret-key-and-a-password', '/support/secure-secret-key'],
  [
    'what-operating-systems-and-browser-requirements-do-i-need-to-run-leather',
    '/support/install-leather',
  ],
  ['where-to-buy-bitcoin-ordinals-marketplaces', deprecationPostPaths.ordinals],
  ['yield-type-fast-pool', '/posts/fast-pool'],
]);

export function isRetiredContentSlug(slug: string) {
  return retiredContentSlugs.includes(slug);
}

export function getLegacyContentTarget(slug: string) {
  return legacyContentTargets.get(slug) ?? null;
}

export function getLegacyContentTargets() {
  return [...legacyContentTargets.values()];
}
