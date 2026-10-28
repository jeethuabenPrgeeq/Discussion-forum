'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ChevronDown, Star } from 'lucide-react';
import styles from './BestAnswerPanel.module.css';

const BONUS_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 1, label: '+1' },
  { value: 2, label: '+2' },
  { value: 5, label: '+5' },
];

export interface BestAnswerChoice {
  bonus: number;
  markAnswered: boolean;
}

interface BestAnswerPanelProps {
  authorName: string;
  onConfirm: (choice: BestAnswerChoice) => void;
  onCancel: () => void;
}

export default function BestAnswerPanel({ authorName, onConfirm, onCancel }: BestAnswerPanelProps) {
  const [bonus, setBonus] = useState(0);
  const [markAnswered, setMarkAnswered] = useState(true);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bonusId = useId();
  const statusId = useId();

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onConfirm({ bonus, markAnswered });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <form className={styles.panel} aria-labelledby={titleId} onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <h4 id={titleId} className={styles.title}>
        <Star size={18} strokeWidth={1.75} fill="currentColor" aria-hidden />
        Mark as best answer?
      </h4>

      <ul className={styles.points}>
        <li>A green &ldquo;Best answer&rdquo; badge shows on this post</li>
        <li>It moves to the top of the topic</li>
        <li>{authorName} gets a notification</li>
      </ul>

      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor={bonusId} className={styles.label}>
            Bonus marks
          </label>
          <div className={styles.selectWrap}>
            <select
              id={bonusId}
              className={styles.select}
              value={bonus}
              onChange={(e) => setBonus(Number(e.target.value))}
            >
              {BONUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown size={20} strokeWidth={1.75} className={styles.chevron} aria-hidden />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor={statusId} className={styles.label}>
            Topic status
          </label>
          <div className={styles.selectWrap}>
            <select
              id={statusId}
              className={styles.select}
              value={markAnswered ? 'answered' : 'open'}
              onChange={(e) => setMarkAnswered(e.target.value === 'answered')}
            >
              <option value="answered">Mark as Answered</option>
              <option value="open">Keep open</option>
            </select>
            <ChevronDown size={20} strokeWidth={1.75} className={styles.chevron} aria-hidden />
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          Cancel
        </button>
        <button ref={confirmRef} type="submit" className={styles.confirm}>
          Confirm
        </button>
      </div>
    </form>
  );
}