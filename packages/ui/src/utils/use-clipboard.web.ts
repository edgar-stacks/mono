import { useEffect, useRef, useState } from 'react';

const copiedResetMs = 1250;

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
  const timer = useRef<number | undefined>(undefined);
  const latestRequest = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      window.clearTimeout(timer.current);
    };
  }, []);

  async function onCopy() {
    latestRequest.current += 1;
    const request = latestRequest.current;
    const hasSucceeded = await copyToClipboard(value);
    if (!isMounted.current || request !== latestRequest.current) return undefined;

    window.clearTimeout(timer.current);
    setHasCopied(hasSucceeded);
    setHasCopyFailed(!hasSucceeded);
    if (hasSucceeded) {
      timer.current = window.setTimeout(() => setHasCopied(false), copiedResetMs);
    }
    return hasSucceeded;
  }

  return { value, onCopy, hasCopied, hasCopyFailed };
}
