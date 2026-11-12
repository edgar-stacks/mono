const newsImages: Record<string, string> = {
  'grow-your-bitcoin-mobile-app': '/marketing/news/grow-your-bitcoin-mobile-app.jpg',
  'grow-your-bitcoin-new-web-app': '/marketing/news/grow-your-bitcoin-new-web-app.png',
  'partnerships-december-2024': '/marketing/news/partnerships-december-2024.png',
  'earn-rewards-sbtc': '/marketing/news/earn-rewards-sbtc.png',
  'partnerships-november-2024': '/marketing/news/partnerships-november-2024.png',
  'token-privacy-dapp-connections': '/marketing/news/token-privacy-dapp-connections.png',
  'bitflow-integration': '/marketing/news/bitflow-integration.png',
  'a-faster-more-reliable-leather-with-mempool-space':
    '/marketing/news/a-faster-more-reliable-leather-with-mempool-space.png',
  'recapping-bitcoin-nashville-2024-why-bitcoin-wallets-need-better-ui-ux':
    '/marketing/news/recapping-bitcoin-nashville-2024-why-bitcoin-wallets-need-better-ui-ux.jpg',
  'giving-users-the-best-bitcoin-wallet-balance-displays-usd-balances-in-leather':
    '/marketing/news/giving-users-the-best-bitcoin-wallet-balance-displays-usd-balances-in-leather.jpg',
};

export function getNewsImage(slug: string) {
  if (!Object.hasOwn(newsImages, slug)) return null;
  return newsImages[slug] ?? null;
}
