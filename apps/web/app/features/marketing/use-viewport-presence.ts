import { type RefObject, useEffect, useState } from 'react';

const nearViewportMargin = '400px 0px';

interface ViewportPresence {
  isNear: boolean;
  isVisible: boolean;
}

export function useViewportPresence(ref: RefObject<Element | null>): ViewportPresence {
  const [isNear, setIsNear] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const nearObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsNear(true);
        nearObserver.disconnect();
      },
      { rootMargin: nearViewportMargin }
    );
    const visibleObserver = new IntersectionObserver(([entry]) =>
      setIsVisible(Boolean(entry?.isIntersecting))
    );

    nearObserver.observe(element);
    visibleObserver.observe(element);
    return () => {
      nearObserver.disconnect();
      visibleObserver.disconnect();
    };
  }, [ref]);

  return { isNear, isVisible };
}
