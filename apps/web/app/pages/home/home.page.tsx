import { Box } from 'leather-styles/jsx';
import { ChangelogStrip } from '~/features/marketing/changelog-strip';
import { type ChangelogStripEntry } from '~/features/marketing/changelog-strip.queries';
import { Page } from '~/layouts/page/page';

import {
  DecentralizedSwapsSection,
  FullControlSection,
  LedgerSection,
  ProtectionSection,
  TrustSection,
  WalletsSection,
} from './home-features';
import { HomeHero } from './home-hero';
import { ProvidersSection } from './home-providers';

interface HomePageProps {
  changelogEntries: ChangelogStripEntry[];
}

export function HomePage({ changelogEntries }: HomePageProps) {
  return (
    <Page>
      <Page.Header />
      <Box pb="space.10">
        <HomeHero />
        <DecentralizedSwapsSection />
        <LedgerSection />
        <WalletsSection />
        <FullControlSection />
        <ProtectionSection />
        <TrustSection />
        <ProvidersSection />
        <ChangelogStrip entries={changelogEntries} />
      </Box>
    </Page>
  );
}
