'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { ForumTopic, ForumWeek } from '@/features/forum/lib/types';
import styles from './MoveTopicDialog.module.css';

interface MoveTopicDialogProps {
  topic: ForumTopic;
  weeks: ForumWeek[];
  onCancel: () => void;
  onConfirm: (weekId: string) => void;
}

export default function MoveTopicDialog({ topic, weeks, onCancel, onConfirm }: MoveTopicDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [target, setTarget] = useState(weeks[0]?.id ?? '');

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <form
        className={styles.body}
        onSubmit={(e) => {
          e.preventDefault();
          if (target) onConfirm(target);
        }}
      >
        <h2 id={titleId} className={styles.title}>
          Move topic
        </h2>
        <p className={styles.text}>
          Move <strong>{topic.title}</strong> to another week. Pinning is cleared on move.
        </p>
        <label className={styles.field}>
          <span>Destination week</span>
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className={styles.primary} disabled={!target}>
            Move
          </button>
        </div>
      </form>
    </dialog>
  );
}