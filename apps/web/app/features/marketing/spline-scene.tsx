import { Suspense, lazy, useEffect, useRef, useState } from 'react';

import type { Application } from '@splinetool/runtime';
import { Box, type BoxProps, styled } from 'leather-styles/jsx';

import { usePrefersReducedMotion } from './use-prefers-reduced-motion';
import { useViewportPresence } from './use-viewport-presence';

const SplineCanvas = lazy(async () => {
  const { SplineCanvas: Canvas } = await import('./spline-canvas.client');
  return { default: Canvas };
});

const splineWasmPath = '/marketing/spline/';

interface SplineSceneProps extends BoxProps {
  scene: string;
  poster: string;
  posterAlt?: string;
}

export function SplineScene({ scene, poster, posterAlt = '', ...props }: SplineSceneProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { isNear, isVisible } = useViewportPresence(wrapperRef);
  const shouldRender = isNear && !prefersReducedMotion;

  useEffect(() => {
    if (!application) return;
    if (isVisible) application.play();
    else application.stop();
  }, [application, isVisible]);

  return (
    <Box ref={wrapperRef} position="relative" {...props}>
      <styled.img
        src={poster}
        alt={posterAlt}
        width="100%"
        height="100%"
        objectFit="contain"
        opacity={application ? 0 : 1}
        transition="opacity 0.3s ease"
        draggable={false}
      />
      {shouldRender && (
        <Box
          aria-hidden
          position="absolute"
          inset={0}
          opacity={application ? 1 : 0}
          transition="opacity 0.3s ease"
        >
          <Suspense fallback={null}>
            <SplineCanvas scene={scene} wasmPath={splineWasmPath} onLoad={setApplication} />
          </Suspense>
        </Box>
      )}
    </Box>
  );
}
