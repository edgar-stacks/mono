import { type RouteConfig, index, route } from '@react-router/dev/routes';

import { bitcoinStakingRoutes } from './pages/bitcoin-staking/bitcoin-staking.routes';
import { multisigRoutes } from './pages/multisig/multisig.routes';
import { playgroundRoutes } from './pages/playground/playground.routes';
import { legacyPathRedirects } from './pages/redirects/legacy-path-redirects';

const legacyPathRedirectRoute = 'pages/redirects/legacy-path-redirect.route.tsx';
const helpCenterRedirectRoute = 'pages/redirects/help-center-wildcard.route.tsx';

export default [
  index('pages/home/home.route.tsx'),
  route('apps', 'pages/apps/apps.route.tsx'),
  route('developers', 'pages/developers/developers.route.tsx'),
  route('news', 'pages/news/news.route.tsx'),
  route('explorer', 'pages/explorer/explorer.route.tsx'),
  route('robots.txt', 'pages/seo/robots.route.ts'),
  route('sitemap.xml', 'pages/seo/sitemap.route.ts'),
  // sBTC
  route('sbtc', 'pages/sbtc/sbtc.route.tsx'),
  // Changelog
  route('changelog', 'pages/changelog/changelog.route.tsx'),
  route('changelog/:slug', 'pages/changelog/changelog-entry.route.tsx'),
  route('changelog.xml', 'pages/changelog/changelog-rss.route.tsx'),
  route('portfolio', 'pages/portfolio/portfolio.route.tsx'),
  // A fallback to legacy post routes
  route('posts', 'pages/posts/posts-index.route.tsx'),
  route('posts/:postSlug', 'pages/posts/post.route.tsx'),
  route('support', 'pages/support/help-center.route.tsx'),
  route('support/search', 'pages/support/search.tsx'),
  route('support/guide/:slug', 'pages/redirects/support-guide-redirect.route.tsx'),
  route('support/:guideSlug', 'pages/support/guide/guide.route.tsx'),
  // Redirects from old help-center URLs
  route('help-center', helpCenterRedirectRoute, { id: 'help-center' }),
  route('help-center/*', helpCenterRedirectRoute, { id: 'help-center-wildcard' }),
  route('guides/*', 'pages/redirects/guides-wildcard.route.tsx'),
  ...legacyPathRedirects.map(({ path }) =>
    route(path.slice(1), legacyPathRedirectRoute, { id: `legacy-path${path}` })
  ),
  // Redirects from the retired stacking URLs, now served under /staking
  route('stacking', 'pages/redirects/stacking-redirect.route.tsx'),
  route('stacking/*', 'pages/redirects/stacking-wildcard.route.tsx'),
  ...multisigRoutes,
  ...playgroundRoutes,
  ...bitcoinStakingRoutes,
  // Fallback route
  route('*', 'pages/error/error-not-found.route.tsx'),
] satisfies RouteConfig;
