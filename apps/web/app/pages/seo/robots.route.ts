import { toAbsoluteUrl } from './marketing-meta';
import { seoFileCacheControl } from './seo-cache';

export function loader() {
  const body = ['User-agent: *', 'Allow: /', '', `Sitemap: ${toAbsoluteUrl('/sitemap.xml')}`, ''];

  return new Response(body.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': seoFileCacheControl,
    },
  });
}
