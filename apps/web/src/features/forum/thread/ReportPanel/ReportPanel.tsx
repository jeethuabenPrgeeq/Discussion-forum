'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ChevronDown, Flag } from 'lucide-react';
import styles from './ReportPanel.module.css';

const REASONS = ['Off-topic', 'Plagiarism', 'Rude language', 'Other'] as const;

export interface PostReport {
  reason: string;
  details: string;
}

interface ReportPanelProps {
  authorName: string;
  onSubmit: (report: PostReport) => void;
  onCancel: () => void;
}

export default function ReportPanel({ authorName, onSubmit, onCancel }: ReportPanelProps) {
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [details, setDetails] = useState('');
  const reasonRef = useRef<HTMLSelectElement>(null);
  const titleId = useId();
  const noteId = useId();
  const reasonId = useId();
  const detailsId = useId();

  useEffect(() => {
    reasonRef.current?.focus();
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ reason, details: details.trim() });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <form
      className={styles.panel}
      aria-labelledby={titleId}
      aria-describedby={noteId}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <h4 id={titleId} className={styles.title}>
        <Flag size={18} strokeWidth={1.75} fill="currentColor" aria-hidden />
        Report this post
      </h4>

      <div className={styles.field}>
        <label htmlFor={reasonId} className={styles.label}>
          Reason
        </label>
        <div className={styles.selectWrap}>
          <select
            ref={reasonRef}
            id={reasonId}
            className={styles.select}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <ChevronDown size={20} strokeWidth={1.75} className={styles.chevron} aria-hidden />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor={detailsId} className={styles.srOnly}>
          Details for the instructor about {authorName}&apos;s post
        </label>
        <textarea
          id={detailsId}
          className={styles.input}
          rows={3}
          placeholder="Tell the instructor what is wrong (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
        <p id={noteId} className={styles.note}>
          Your name is not shown to the author.
        </p>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={styles.submit}>
          Send report
        </button>
      </div>
    </form>
  );
}