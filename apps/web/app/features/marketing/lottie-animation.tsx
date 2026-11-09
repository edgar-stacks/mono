import { useEffect, useRef, useState } from 'react';

import { Box, type BoxProps, styled } from 'leather-styles/jsx';
import type { AnimationItem } from 'lottie-web';

import { loadLottie } from './marketing-animation-loaders.client';
import { useNearViewport } from './use-near-viewport';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';

type LottiePlayback = 'loop' | 'once-per-view' | 'manual';

interface LottieAnimationProps extends Omit<BoxProps, 'children'> {
  src: string;
  poster: string;
  alt: string;
  width: number;
  height: number;
  playback?: LottiePlayback;
  onAnimationReady?(animation: AnimationItem): void;
}

export function LottieAnimation({
  src,
  poster,
  alt,
  width,
  height,
  playback = 'loop',
  onAnimationReady,
  ...props
}: LottieAnimationProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const onReadyRef = useRef(onAnimationReady);
  onReadyRef.current = onAnimationReady;
  const [isLoaded, setIsLoaded] = useState(false);
  const { isNear, isVisible } = useNearViewport(wrapperRef);
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldLoad = isNear && !prefersReducedMotion;

  useEffect(() => {
    const container = containerRef.current;
    if (!shouldLoad || !container) return;
    let isCancelled = false;

    async function initAnimation(element: HTMLDivElement) {
      const { default: lottie } = await loadLottie();
      if (isCancelled) return;
      const animation = lottie.loadAnimation({
        container: element,
        path: src,
        renderer: 'svg',
        loop: playback === 'loop',
        autoplay: false,
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: true },
      });
      animation.addEventListener('DOMLoaded', () => {
        if (isCancelled) return;
        animationRef.current = animation;
        setIsLoaded(true);
        onReadyRef.current?.(animation);
      });
      animationRef.current = animation;
    }

    void initAnimation(container);

    return () => {
      isCancelled = true;
      animationRef.current?.destroy();
      animationRef.current = null;
      setIsLoaded(false);
    };
  }, [shouldLoad, src, playback]);

  useEffect(() => {
    const animation = animationRef.current;
    if (!isLoaded || !animation) return;
    if (!isVisible) {
      animation.pause();
      return;
    }
    if (playback === 'once-per-view') {
      animation.goToAndPlay(0, true);
      return;
    }
    animation.play();
  }, [isLoaded, isVisible, playback]);

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
        transition="opacity 0.2s ease"
      />
      <Box
        ref={containerRef}
        aria-hidden
        position="absolute"
        inset={0}
        opacity={isLoaded ? 1 : 0}
        transition="opacity 0.2s ease"
      />
    </Box>
  );
}
