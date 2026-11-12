import { cmsClient } from '~/constants/cms-client';
import { withFallback } from '~/utils/with-fallback';

export interface ChangelogStripEntry {
  _id: string;
  title: string;
  slug: string;
  publishedAt: string;
  tags: string[] | null;
}

const changelogStripQuery = `*[
  _type == "changelog" && publishedAt <= now() && defined(slug.current)
] | order(publishedAt desc)[0...4]{
  _id,
  title,
  "slug": slug.current,
  publishedAt,
  "tags": tags[]->name
}`;

export function fetchChangelogStrip() {
  return withFallback(cmsClient.fetch<ChangelogStripEntry[]>(changelogStripQuery), []);
}
