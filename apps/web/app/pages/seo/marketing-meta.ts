import { type MetaDescriptor } from 'react-router';

const canonicalOrigin = 'https://leather.io';

const defaultDescription =
  'Leather is a wallet for Bitcoin and Stacks, designed for security, clarity, and growth.';

export function canonicalUrl(path: string) {
  return new URL(path, canonicalOrigin).href;
}

interface MarketingMetaOptions {
  title: string;
  path: string;
  description?: string;
  image?: string;
}

export function marketingMeta({
  title,
  path,
  description = defaultDescription,
  image,
}: MarketingMetaOptions): MetaDescriptor[] {
  const url = canonicalUrl(path);
  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    ...(image ? [{ property: 'og:image', content: canonicalUrl(image) }] : []),
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
  ];
}
