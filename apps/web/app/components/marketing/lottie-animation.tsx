import { useEffect, useRef, useState } from 'react';

import { Box, type BoxProps, styled } from 'leather-styles/jsx';
import type { AnimationItem } from 'lottie-web';

import { useInViewport } from './use-in-viewport';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';

const loadLottie = import.meta.env.SSR
  ? null
  : () => import('lottie-web/build/player/lottie_light');

const preloadMargin = '400px';

interface LottieAnimationProps extends Omit<BoxProps, 'width' | 'height'> {
  src: string;
  width: number;
  height: number;
  poster?: string;
  loop?: boolean;
  autoplay?: boolean;
  onAnimationLoad?(animation: AnimationItem): void;
}

export function LottieAnimation({
  src,
  width,
  height,
  poster,
  loop = true,
  autoplay = true,
  onAnimationLoad,
  ...props
}: LottieAnimationProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onAnimationLoadRef = useRef(onAnimationLoad);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isNearViewport = useInViewport(wrapperRef, { rootMargin: preloadMargin, once: true });
  const isVisible = useInViewport(wrapperRef);
  const [animation, setAnimation] = useState<AnimationItem | null>(null);

  useEffect(() => {
    onAnimationLoadRef.current = onAnimationLoad;
  }, [onAnimationLoad]);

  useEffect(() => {
    const container = containerRef.current;
    if (!loadLottie || prefersReducedMotion || !isNearViewport || !container) return;

    let cancelled = false;
    let item: AnimationItem | null = null;

    async function mountAnimation(load: NonNullable<typeof loadLottie>, element: HTMLDivElement) {
      const { default: lottie } = await load();
      if (cancelled) return;
      const loadedItem = lottie.loadAnimation({
        container: element,
        renderer: 'svg',
        loop,
        autoplay: false,
        path: src,
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
      });
      item = loadedItem;
      loadedItem.addEventListener('DOMLoaded', () => {
        if (cancelled) return;
        setAnimation(loadedItem);
        onAnimationLoadRef.current?.(loadedItem);
      });
    }

    mountAnimation(loadLottie, container).catch(() => setAnimation(null));

    return () => {
      cancelled = true;
      item?.destroy();
      setAnimation(null);
    };
  }, [src, loop, prefersReducedMotion, isNearViewport]);

  useEffect(() => {
    if (!animation || !autoplay) return;
    if (!isVisible) {
      animation.pause();
      return;
    }
    if (loop) animation.play();
    else animation.goToAndPlay(0, true);
  }, [animation, autoplay, isVisible, loop]);

  return (
    <Box
      ref={wrapperRef}
      position="relative"
      style={{ aspectRatio: `${width} / ${height}` }}
      {...props}
    >
      {poster && !animation && (
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
      )}
      <Box ref={containerRef} position="absolute" inset={0} aria-hidden />
    </Box>
  );
}
