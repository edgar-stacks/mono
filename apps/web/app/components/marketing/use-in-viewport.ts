import { type RefObject, useEffect, useState } from 'react';

interface UseInViewportOptions {
  rootMargin?: string;
  once?: boolean;
}

export function useInViewport(
  ref: RefObject<Element | null>,
  { rootMargin = '0px', once = false }: UseInViewportOptions = {}
) {
  const [isInViewport, setIsInViewport] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setIsInViewport(entry.isIntersecting);
        if (entry.isIntersecting && once) observer.disconnect();
      },
      { rootMargin }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin, once]);

  return isInViewport;
}
