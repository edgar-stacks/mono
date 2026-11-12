import { useEffect, useRef, useState } from 'react';

const copiedFeedbackMs = 1250;

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
  const latestAttempt = useRef(0);
  const isMounted = useRef(true);

  async function onCopy() {
    latestAttempt.current += 1;
    const attempt = latestAttempt.current;
    const didCopy = await copyToClipboard(value);
    if (!isMounted.current || attempt !== latestAttempt.current) return undefined;
    setHasCopied(didCopy);
    setHasCopyFailed(!didCopy);
    if (didCopy) {
      timers.current.push(
        window.setTimeout(() => {
          if (attempt === latestAttempt.current) setHasCopied(false);
        }, copiedFeedbackMs)
      );
    }
    return didCopy;
  }

  useEffect(() => {
    isMounted.current = true;
    const pendingTimers = timers.current;
    return () => {
      isMounted.current = false;
      pendingTimers.forEach(timer => clearTimeout(timer));
    };
  }, []);

  return { value, onCopy, hasCopied, hasCopyFailed };
}
