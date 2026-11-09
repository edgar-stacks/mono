import { useEffect, useState } from 'react';

const dockSelector = '[data-playground-dock]';
const fallbackInset = 72;

function measureDockInset() {
  const dock = document.querySelector(dockSelector);
  if (!dock) return 0;
  return Math.max(0, window.innerHeight - dock.getBoundingClientRect().top);
}

export function usePlaygroundDockInset() {
  const [inset, setInset] = useState(fallbackInset);

  useEffect(() => {
    function update() {
      setInset(measureDockInset());
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return inset;
}
