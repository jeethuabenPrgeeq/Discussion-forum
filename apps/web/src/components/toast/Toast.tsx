'use client';

import { useCallback, useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import styles from './Toast.module.css';

export type ToastTone = 'success' | 'error' | 'info';

const ERROR_PATTERN = /could not|couldn't|failed|error|unable|can't|cannot|try again|isn't available|not allowed|\bonly\b/i;

export const toneOf = (message: string): ToastTone => (ERROR_PATTERN.test(message) ? 'error' : 'success');

const withSuccess = (text: string, tone: ToastTone) =>
  tone === 'success' && !/success/i.test(text) ? `${text.replace(/[.!\s]+$/, '')} successfully` : text;

interface ToastState {
  text: string;
  tone: ToastTone;
  key: number;
}

export function useToast(duration = 2500) {
  const [state, setState] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!state) return;
    const id = window.setTimeout(() => setState(null), duration);
    return () => window.clearTimeout(id);
  }, [state, duration]);

  const show = useCallback((next: string, tone?: ToastTone) => {
    setState((s) => ({ text: next, tone: tone ?? toneOf(next), key: (s?.key ?? 0) + 1 }));
  }, []);

  return { message: state?.text ?? null, tone: state?.tone, show };
}

interface ToastProps {
  message: string | null;
  tone?: ToastTone;
}

export default function Toast({ message, tone }: ToastProps) {
  const [last, setLast] = useState<{ text: string; tone: ToastTone } | null>(null);
  const current = message ? { text: message, tone: tone ?? toneOf(message) } : null;

  if (current && (current.text !== last?.text || current.tone !== last?.tone)) {
    setLast(current);
  }

  const shown = current ?? last;

  return (
    <div className={styles.toast} role="status" aria-live="polite" data-visible={message ? true : undefined} data-tone={shown?.tone}>
      {shown && (
        <span className={styles.content}>
          {shown.tone === 'error' ? (
            <CircleAlert size={20} strokeWidth={2} className={styles.icon} aria-hidden />
          ) : shown.tone === 'info' ? (
            <Info size={20} strokeWidth={2} className={styles.icon} aria-hidden />
          ) : (
            <CircleCheck size={20} strokeWidth={2} className={styles.icon} aria-hidden />
          )}
          <span className={styles.text}>{withSuccess(shown.text, shown.tone)}</span>
        </span>
      )}
    </div>
  );
}