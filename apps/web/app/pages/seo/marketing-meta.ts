import { type MetaDescriptor } from 'react-router';

import { defaultOgImagePath, siteName, toAbsoluteUrl } from './seo.constants';

interface MarketingMetaOptions {
  title: string;
  path: string;
  description?: string;
  image?: string;
}

function formatPageTitle(title: string) {
  return title === siteName ? title : `${title} – ${siteName}`;
}

export function marketingMeta({
  title,
  path,
  description,
  image = defaultOgImagePath,
}: MarketingMetaOptions): MetaDescriptor[] {
  const pageTitle = formatPageTitle(title);
  const url = toAbsoluteUrl(path);
  const imageUrl = toAbsoluteUrl(image);
  const descriptionTags: MetaDescriptor[] = description
    ? [
        { name: 'description', content: description },
        { property: 'og:description', content: description },
        { name: 'twitter:description', content: description },
      ]
    : [];

  return [
    { title: pageTitle },
    ...descriptionTags,
    { property: 'og:title', content: pageTitle },
    { property: 'og:url', content: url },
    { property: 'og:image', content: imageUrl },
    { property: 'og:site_name', content: siteName },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: pageTitle },
    { name: 'twitter:image', content: imageUrl },
    { tagName: 'link', rel: 'canonical', href: url },
  ];
}
