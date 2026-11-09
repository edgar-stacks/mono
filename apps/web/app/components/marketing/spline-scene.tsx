import { Suspense, lazy, useRef } from 'react';

import { Box, type BoxProps, styled } from 'leather-styles/jsx';

import { useInViewport } from './use-in-viewport';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';

const Spline = import.meta.env.SSR ? null : lazy(() => import('@splinetool/react-spline'));

const preloadMargin = '400px';

interface SplineSceneProps extends Omit<BoxProps, 'width' | 'height'> {
  scene: string;
  width: number;
  height: number;
  poster?: string;
}

export function SplineScene({ scene, width, height, poster, ...props }: SplineSceneProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isNearViewport = useInViewport(wrapperRef, { rootMargin: preloadMargin, once: true });
  const posterImage = poster ? (
    <styled.img
      src={poster}
      alt=""
      position="absolute"
      inset={0}
      width="100%"
      height="100%"
      objectFit="contain"
      loading="lazy"
    />
  ) : null;

  return (
    <Box
      ref={wrapperRef}
      position="relative"
      style={{ aspectRatio: `${width} / ${height}` }}
      aria-hidden
      {...props}
    >
      {Spline && isNearViewport && !prefersReducedMotion ? (
        <Suspense fallback={posterImage}>
          <Spline scene={scene} style={{ position: 'absolute', inset: 0 }} />
        </Suspense>
      ) : (
        posterImage
      )}
    </Box>
  );
}
