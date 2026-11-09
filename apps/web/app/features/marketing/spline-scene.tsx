import { type ComponentType, useEffect, useRef, useState } from 'react';

import type { SplineProps } from '@splinetool/react-spline';
import { Box, type BoxProps, styled } from 'leather-styles/jsx';

import { loadSpline } from './marketing-animation-loaders.client';
import { useNearViewport } from './use-near-viewport';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';

interface SplineSceneProps extends Omit<BoxProps, 'children'> {
  scene: string;
  poster: string;
  alt: string;
  width: number;
  height: number;
}

export function SplineScene({ scene, poster, alt, width, height, ...props }: SplineSceneProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [Spline, setSpline] = useState<ComponentType<SplineProps> | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { isNear } = useNearViewport(wrapperRef);
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldLoad = isNear && !prefersReducedMotion;

  useEffect(() => {
    if (!shouldLoad) return;
    let isCancelled = false;
    async function initSpline() {
      const { default: SplineComponent } = await loadSpline();
      if (!isCancelled) setSpline(() => SplineComponent);
    }
    void initSpline();
    return () => {
      isCancelled = true;
    };
  }, [shouldLoad]);

  return (
    <Box
      ref={wrapperRef}
      position="relative"
      width="100%"
      style={{ aspectRatio: `${width} / ${height}` }}
      {...props}
    >
      <styled.img
        src={poster}
        alt={alt}
        loading="lazy"
        decoding="async"
        position="absolute"
        inset={0}
        width="100%"
        height="100%"
        objectFit="contain"
        opacity={isLoaded ? 0 : 1}
        transition="opacity 0.3s ease"
      />
      {Spline && shouldLoad && (
        <Box
          aria-hidden
          position="absolute"
          inset={0}
          opacity={isLoaded ? 1 : 0}
          transition="opacity 0.3s ease"
        >
          <Spline
            scene={scene}
            onLoad={() => setIsLoaded(true)}
            style={{ width: '100%', height: '100%' }}
          />
        </Box>
      )}
    </Box>
  );
}
