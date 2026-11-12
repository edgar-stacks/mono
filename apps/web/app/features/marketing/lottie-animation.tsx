import { useEffect, useRef, useState } from 'react';

import { Box, type BoxProps, styled } from 'leather-styles/jsx';
import type { AnimationItem, AnimationSegment } from 'lottie-web';

import { usePrefersReducedMotion } from './use-prefers-reduced-motion';
import { useViewportPresence } from './use-viewport-presence';

interface LottieAnimationProps extends BoxProps {
  src: string;
  poster: string;
  posterAlt?: string;
  loop?: boolean;
  segment?: AnimationSegment;
  replayOnEnter?: boolean;
}

export function LottieAnimation({
  src,
  poster,
  posterAlt = '',
  loop = true,
  segment,
  replayOnEnter = false,
  ...props
}: LottieAnimationProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { isNear, isVisible } = useViewportPresence(wrapperRef);

  useEffect(() => {
    const container = containerRef.current;
    if (!isNear || prefersReducedMotion || !container) return;
    let isCancelled = false;

    async function loadAnimation(target: HTMLDivElement) {
      const { loadLottieAnimation } = await import('./lottie-player.client');
      if (isCancelled) return;
      const animation = loadLottieAnimation({ container: target, path: src, loop });
      animation.addEventListener('DOMLoaded', () => setIsLoaded(true));
      animationRef.current = animation;
    }
    void loadAnimation(container);

    return () => {
      isCancelled = true;
      animationRef.current?.destroy();
      animationRef.current = null;
      setIsLoaded(false);
    };
  }, [isNear, prefersReducedMotion, src, loop]);

  useEffect(() => {
    const animation = animationRef.current;
    if (!animation || !isLoaded) return;
    if (!isVisible) {
      animation.pause();
      return;
    }
    animation.loop = loop;
    if (segment) {
      animation.playSegments(segment, true);
      return;
    }
    if (replayOnEnter) {
      animation.goToAndPlay(0, true);
      return;
    }
    animation.play();
  }, [isVisible, isLoaded, loop, segment, replayOnEnter]);

  return (
    <Box ref={wrapperRef} position="relative" {...props}>
      <styled.img
        src={poster}
        alt={posterAlt}
        width="100%"
        height="100%"
        objectFit="contain"
        opacity={isLoaded ? 0 : 1}
        transition="opacity 0.2s ease"
        draggable={false}
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
