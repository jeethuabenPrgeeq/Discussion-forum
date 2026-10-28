'use client';

import { useEffect, useId, useRef } from 'react';
import { BadgeCheck, SquareCheck } from 'lucide-react';
import styles from './MessageDialog.module.css';

interface MessageDialogProps {
  open: boolean;
  title: string;
  message: string;
  buttonLabel?: string;
  autoCloseMs?: number;
  variant?: 'center' | 'compact';
  onClose: () => void;
}

export default function MessageDialog({
  open,
  title,
  message,
  buttonLabel = 'OK',
  autoCloseMs,
  variant = 'center',
  onClose,
}: MessageDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      buttonRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open || !autoCloseMs) return;
    const id = window.setTimeout(() => closeRef.current(), autoCloseMs);
    return () => window.clearTimeout(id);
  }, [open, autoCloseMs]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      data-variant={variant}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {variant === 'compact' ? (
        <div className={styles.compactBody}>
          <h2 id={titleId} className={styles.compactTitle}>
            <SquareCheck size={22} strokeWidth={2} className={styles.compactIcon} aria-hidden />
            {title}
          </h2>
          <p id={messageId} className={styles.compactMessage}>
            {message}
          </p>
          <div className={styles.compactActions}>
            <button ref={buttonRef} type="button" className={styles.done} onClick={onClose}>
              {buttonLabel}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.body}>
          <span className={styles.icon} aria-hidden="true">
            <BadgeCheck size={28} strokeWidth={1.75} />
          </span>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <p id={messageId} className={styles.message}>
            {message}
          </p>
          <button ref={buttonRef} type="button" className={styles.ok} onClick={onClose}>
            {buttonLabel}
          </button>
        </div>
      )}
    </dialog>
  );
}