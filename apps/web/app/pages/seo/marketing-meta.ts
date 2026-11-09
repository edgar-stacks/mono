import { type MetaDescriptor } from 'react-router';

const siteOrigin = 'https://leather.io';

const brandName = 'Leather';
const defaultDescription =
  'Leather is a self-custodial wallet built for earning yield and managing assets in the Bitcoin ecosystem. Open-source and secure, it supports BTC, STX, Ordinals, BRC-20s, and more—giving users full control across apps, DeFi, and marketplaces.';
const defaultImagePath = '/marketing/og-image.png';

export const marketingCacheHeaders = {
  'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
};

export function toAbsoluteUrl(path: string) {
  return new URL(path, siteOrigin).toString();
}

interface MarketingMetaOptions {
  title: string;
  path: string;
  description?: string;
  image?: string;
}

export function marketingMeta({ title, path, description, image }: MarketingMetaOptions) {
  const fullTitle = title === brandName ? title : `${title} – ${brandName}`;
  const content = description || defaultDescription;
  const url = toAbsoluteUrl(path);
  const imageUrl = toAbsoluteUrl(image ?? defaultImagePath);

  return [
    { title: fullTitle },
    { name: 'description', content },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content },
    { property: 'og:url', content: url },
    { property: 'og:image', content: imageUrl },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: fullTitle },
    { name: 'twitter:description', content },
    { name: 'twitter:image', content: imageUrl },
    { tagName: 'link', rel: 'canonical', href: url },
  ] satisfies MetaDescriptor[];
}
