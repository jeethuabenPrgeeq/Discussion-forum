'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './Toast.module.css';

export function useToast(duration = 2500) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), duration);
    return () => window.clearTimeout(id);
  }, [message, duration]);

  const show = useCallback((next: string) => setMessage(next), []);

  return { message, show };
}

export default function Toast({ message }: { message: string | null }) {
  return (
    <div className={styles.toast} role="status" aria-live="polite" data-visible={message ? true : undefined}>
      {message}
    </div>
  );
}