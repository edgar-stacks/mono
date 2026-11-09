import { type ReactNode } from 'react';
import { Link } from 'react-router';

import { css } from 'leather-styles/css';
import { Box, Flex, Grid, type HTMLStyledProps, VStack, styled } from 'leather-styles/jsx';

import { type EcosystemApp, type YieldProvider, downloadLinks } from './marketing-data';

interface MarketingSectionProps extends Omit<HTMLStyledProps<'section'>, 'title'> {
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
}

export function MarketingSection({
  eyebrow,
  title,
  description,
  children,
  ...props
}: MarketingSectionProps) {
  return (
    <styled.section py={['space.08', 'space.08', 'space.10']} {...props}>
      {(eyebrow || title || description) && (
        <VStack alignItems="flex-start" gap="space.03" mb="space.07" maxWidth="720px">
          {eyebrow && (
            <styled.span textStyle="label.03" color="ink.text-subdued" textTransform="uppercase">
              {eyebrow}
            </styled.span>
          )}
          {title && <styled.h2 textStyle="heading.02">{title}</styled.h2>}
          {description && (
            <styled.p textStyle="body.01" color="ink.text-subdued">
              {description}
            </styled.p>
          )}
        </VStack>
      )}
      {children}
    </styled.section>
  );
}

interface StoreLinkProps {
  href: string;
  label: string;
}

function StoreLink({ href, label }: StoreLinkProps) {
  return (
    <styled.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      gap="space.02"
      minWidth="112px"
      px="space.05"
      py="space.03"
      borderRadius="xs"
      textStyle="label.02"
      bg="ink.action-primary-default"
      color="ink.background-primary"
      _hover={{ bg: 'ink.action-primary-hover' }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'ink.action-primary-default',
        outlineOffset: '2px',
      }}
    >
      {label}
    </styled.a>
  );
}

export function DownloadButtons() {
  return (
    <Flex gap="space.03" flexWrap="wrap">
      <StoreLink href={downloadLinks.chrome} label="Chrome" />
      <StoreLink href={downloadLinks.ios} label="iOS" />
      <StoreLink href={downloadLinks.android} label="Android" />
    </Flex>
  );
}

interface WordTickerProps {
  words: string[];
}

export function WordTicker({ words }: WordTickerProps) {
  const [firstWord] = words;
  return (
    <styled.span
      display="inline-block"
      height="1.1em"
      overflow="hidden"
      verticalAlign="bottom"
      aria-label={words.join(' ')}
    >
      <styled.span
        aria-hidden
        display="flex"
        flexDirection="column"
        lineHeight="1.1em"
        animation="marketingWordTicker 10s infinite cubic-bezier(0.65, 0, 0.35, 1)"
        _motionReduce={{ animation: 'none' }}
      >
        {[...words, firstWord].map((word, index) => (
          <styled.span key={`${word}-${index}`} height="1.1em">
            {word}
          </styled.span>
        ))}
      </styled.span>
    </styled.span>
  );
}

interface PlatformBadgeProps {
  platform: string;
}

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  return (
    <styled.span
      textStyle="label.03"
      color="ink.text-subdued"
      border="default"
      borderRadius="xs"
      px="space.02"
      py="1px"
    >
      {platform}
    </styled.span>
  );
}

interface FeatureCardProps extends HTMLStyledProps<'article'> {
  title: string;
  description: string;
  platform?: string;
  visual: ReactNode;
}

export function FeatureCard({ title, description, platform, visual, ...props }: FeatureCardProps) {
  return (
    <styled.article
      display="flex"
      flexDirection="column"
      gap="space.05"
      p="space.05"
      borderRadius="md"
      bg="ink.background-secondary"
      overflow="hidden"
      {...props}
    >
      <Box flex={1} display="flex" alignItems="center" justifyContent="center">
        {visual}
      </Box>
      <VStack alignItems="flex-start" gap="space.02">
        <Flex gap="space.02" alignItems="center" flexWrap="wrap">
          <styled.h3 textStyle="heading.05">{title}</styled.h3>
          {platform && <PlatformBadge platform={platform} />}
        </Flex>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {description}
        </styled.p>
      </VStack>
    </styled.article>
  );
}

interface MarketingImageProps extends HTMLStyledProps<'img'> {
  src: string;
  alt: string;
}

export function MarketingImage({ src, alt, ...props }: MarketingImageProps) {
  return (
    <styled.img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      maxWidth="100%"
      height="auto"
      {...props}
    />
  );
}

interface YieldProviderListProps {
  providers: YieldProvider[];
}

export function YieldProviderList({ providers }: YieldProviderListProps) {
  return (
    <VStack alignItems="stretch" gap="space.03" width="100%">
      <Flex justifyContent="space-between" textStyle="label.03" color="ink.text-subdued">
        <styled.span>Providers</styled.span>
        <styled.span>Historical yield</styled.span>
      </Flex>
      <VStack as="ul" alignItems="stretch" gap="space.03">
        {providers.map(provider => (
          <Flex as="li" key={provider.name} justifyContent="space-between" alignItems="center">
            <Flex alignItems="center" gap="space.03">
              <MarketingImage
                src={provider.logo}
                alt=""
                width="32px"
                height="32px"
                borderRadius="round"
                objectFit="cover"
              />
              <VStack alignItems="flex-start" gap="0">
                <styled.span textStyle="label.02">{provider.name}</styled.span>
                {provider.description && (
                  <styled.span textStyle="caption.01" color="ink.text-subdued">
                    {provider.description}
                  </styled.span>
                )}
              </VStack>
            </Flex>
            <styled.span textStyle="label.02">{provider.yield}</styled.span>
          </Flex>
        ))}
      </VStack>
    </VStack>
  );
}

interface YieldCardProps {
  title: string;
  description: string;
  providers: YieldProvider[];
  href: string;
}

export function YieldCard({ title, description, providers, href }: YieldCardProps) {
  return (
    <Link to={href} prefetch="intent">
      <VStack
        alignItems="flex-start"
        gap="space.05"
        p="space.05"
        height="100%"
        borderRadius="md"
        border="default"
        _hover={{ bg: 'ink.component-background-hover' }}
      >
        <VStack alignItems="flex-start" gap="space.02">
          <styled.h3 textStyle="heading.05">{title}</styled.h3>
          <styled.p textStyle="body.02" color="ink.text-subdued">
            {description}
          </styled.p>
        </VStack>
        <YieldProviderList providers={providers} />
      </VStack>
    </Link>
  );
}

interface YieldHighlightProps {
  label: string;
  value: string;
}

export function YieldHighlight({ label, value }: YieldHighlightProps) {
  return (
    <VStack alignItems="flex-start" gap="space.01">
      <styled.span textStyle="display.02">{value}</styled.span>
      <styled.span textStyle="caption.01" color="ink.text-subdued" whiteSpace="pre-line">
        {label}
      </styled.span>
    </VStack>
  );
}

interface AppCardProps {
  app: EcosystemApp;
  href?: string;
}

export function FeaturedAppCard({ app, href = `/posts/${app.slug}` }: AppCardProps) {
  return (
    <Link to={href} prefetch="intent">
      <VStack
        alignItems="stretch"
        gap="space.04"
        height="100%"
        borderRadius="md"
        border="default"
        overflow="hidden"
        _hover={{ bg: 'ink.component-background-hover' }}
      >
        {app.cover && (
          <MarketingImage
            src={app.cover}
            alt=""
            width="100%"
            aspectRatio="16 / 9"
            objectFit="cover"
          />
        )}
        <VStack alignItems="flex-start" gap="space.02" px="space.05" pb="space.05">
          <Flex alignItems="center" gap="space.03">
            <MarketingImage src={app.logo} alt="" width="28px" height="28px" borderRadius="xs" />
            <styled.h3 textStyle="heading.05">{app.name}</styled.h3>
          </Flex>
          <styled.p textStyle="body.02" color="ink.text-subdued">
            {app.description}
          </styled.p>
        </VStack>
      </VStack>
    </Link>
  );
}

export function AppListItem({ app, href = `/posts/${app.slug}` }: AppCardProps) {
  return (
    <Link to={href} prefetch="intent">
      <Flex
        gap="space.04"
        alignItems="flex-start"
        py="space.04"
        borderBottom="default"
        _hover={{ bg: 'ink.component-background-hover' }}
      >
        <MarketingImage src={app.logo} alt="" width="40px" height="40px" borderRadius="sm" />
        <VStack alignItems="flex-start" gap="space.01">
          <styled.h3 textStyle="label.01">{app.name}</styled.h3>
          <styled.p textStyle="body.02" color="ink.text-subdued">
            {app.description}
          </styled.p>
        </VStack>
      </Flex>
    </Link>
  );
}

const cardGridColumns = {
  2: css({ gridTemplateColumns: ['1fr', '1fr', 'repeat(2, 1fr)'] }),
  3: css({ gridTemplateColumns: ['1fr', '1fr', 'repeat(2, 1fr)', 'repeat(3, 1fr)'] }),
  4: css({ gridTemplateColumns: ['1fr', '1fr', 'repeat(2, 1fr)', 'repeat(4, 1fr)'] }),
};

interface CardGridProps {
  columns?: keyof typeof cardGridColumns;
  children: ReactNode;
}

export function CardGrid({ columns = 3, children }: CardGridProps) {
  return (
    <Grid gap="space.04" className={cardGridColumns[columns]}>
      {children}
    </Grid>
  );
}
