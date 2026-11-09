import { type RefObject, useEffect, useState } from 'react';

const nearViewportMargin = '400px';

interface ViewportState {
  isNear: boolean;
  isVisible: boolean;
}

export function useNearViewport(ref: RefObject<Element | null>): ViewportState {
  const [state, setState] = useState<ViewportState>({ isNear: false, isVisible: false });

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const nearObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setState(current => ({ ...current, isNear: true }));
      },
      { rootMargin: nearViewportMargin }
    );
    const visibleObserver = new IntersectionObserver(([entry]) => {
      setState(current => ({ ...current, isVisible: Boolean(entry?.isIntersecting) }));
    });

    nearObserver.observe(element);
    visibleObserver.observe(element);
    return () => {
      nearObserver.disconnect();
      visibleObserver.disconnect();
    };
  }, [ref]);

  return state;
}
