import { useEffect, useState } from 'react';

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

function matchesReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(reducedMotionQuery).matches;
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(matchesReducedMotion);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(reducedMotionQuery);
    function onChange() {
      setReduced(query.matches);
    }
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
