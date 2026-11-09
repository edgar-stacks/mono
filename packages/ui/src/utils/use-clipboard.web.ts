import { useEffect, useRef, useState } from 'react';

const copiedDisplayMs = 1250;

interface UiClipboard {
  value: string;
  onCopy(): Promise<boolean | undefined>;
  hasCopied: boolean;
  hasCopyFailed: boolean;
}

async function copyToClipboard(value: string) {
  if (!navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function useClipboard(value: string): UiClipboard {
  const [hasCopied, setHasCopied] = useState(false);
  const [hasCopyFailed, setHasCopyFailed] = useState(false);
  const timers = useRef<number[]>([]);
  const latestRequest = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const pendingTimers = timers.current;
    return () => {
      isMounted.current = false;
      pendingTimers.forEach(timer => clearTimeout(timer));
    };
  }, []);

  async function onCopy() {
    latestRequest.current += 1;
    const request = latestRequest.current;
    const hasSucceeded = await copyToClipboard(value);
    if (!isMounted.current || request !== latestRequest.current) return undefined;
    setHasCopied(hasSucceeded);
    setHasCopyFailed(!hasSucceeded);
    if (hasSucceeded) {
      timers.current.splice(0).forEach(timer => clearTimeout(timer));
      timers.current.push(window.setTimeout(() => setHasCopied(false), copiedDisplayMs));
    }
    return hasSucceeded;
  }

  return { value, onCopy, hasCopied, hasCopyFailed };
}
