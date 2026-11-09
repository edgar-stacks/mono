import { cmsClient } from '~/constants/cms-client';
import { fetchCmsWithFallback } from '~/utils/cms-fetch';

export interface ChangelogHighlight {
  _id: string;
  title: string;
  slug: string;
  publishedAt: string;
  tags: { name: string }[] | null;
}

const changelogHighlightsQuery = `*[
  _type == "changelog" && defined(slug.current) && publishedAt <= now()
] | order(publishedAt desc)[0...4] {
  _id, title, "slug": slug.current, publishedAt, tags[]->{ name }
}`;

export function fetchChangelogHighlights() {
  return fetchCmsWithFallback<ChangelogHighlight[]>(
    signal => cmsClient.fetch<ChangelogHighlight[]>(changelogHighlightsQuery, {}, { signal }),
    []
  );
}
