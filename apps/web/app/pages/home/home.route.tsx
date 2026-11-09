import { VStack } from 'leather-styles/jsx';
import { ChangelogStrip } from '~/components/marketing/changelog-strip';
import { fetchChangelogStrip } from '~/components/marketing/changelog-strip.query';
import { Page } from '~/layouts/page/page';
import { marketingCacheHeaders, marketingMeta } from '~/pages/seo/marketing-meta';

import { type Route } from './+types/home.route';
import { BuyPartners } from './components/buy-partners';
import { FullControlSection } from './components/full-control-section';
import { HomeHero } from './components/home-hero';
import { LedgerSection } from './components/ledger-section';
import { PhishingNotice } from './components/phishing-notice';
import { ProtectionSection } from './components/protection-section';
import { ProvidersSection } from './components/providers-section';
import { SwapsSection } from './components/swaps-section';
import { TrustSection } from './components/trust-section';
import { WalletsSection } from './components/wallets-section';

export function meta() {
  return marketingMeta({ title: 'Leather', path: '/' });
}

export function headers() {
  return marketingCacheHeaders;
}

export async function loader() {
  return { changelogEntries: await fetchChangelogStrip() };
}

export default function HomeRoute({ loaderData }: Route.ComponentProps) {
  return (
    <Page>
      <Page.Header />
      <PhishingNotice />
      <VStack alignItems="stretch" gap={['space.10', null, '120px']} mt="space.07" mb="space.10">
        <div>
          <HomeHero />
          <BuyPartners />
        </div>
        <SwapsSection />
        <LedgerSection />
        <WalletsSection />
        <FullControlSection />
        <ProtectionSection />
        <TrustSection />
        <ProvidersSection />
        <ChangelogStrip entries={loaderData.changelogEntries} />
      </VStack>
    </Page>
  );
}
