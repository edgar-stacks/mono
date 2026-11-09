import {
  contentResolutionResponse,
  notFound,
  permanentRedirect,
  sanityContentFetchers,
} from './content-slug-loader';
import { resolveContentSlug } from './content-slug-resolver';
import { type LegacySectionPathResult } from './legacy-section-paths';

export async function legacySectionRedirect(result: LegacySectionPathResult, request: Request) {
  if (result.kind === 'not-found') return notFound();
  if (result.kind === 'redirect') return permanentRedirect(result.path, request);
  const resolution = await resolveContentSlug(result.slug, sanityContentFetchers);
  return contentResolutionResponse(resolution, request);
}
