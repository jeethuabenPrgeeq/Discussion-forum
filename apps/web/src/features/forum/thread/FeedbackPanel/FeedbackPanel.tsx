'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Check, ChevronDown, NotebookPen } from 'lucide-react';
import type { FeedbackRating, ForumPost, PostFeedback } from '@/features/forum/lib/types';
import styles from './FeedbackPanel.module.css';

export const FEEDBACK_RATING_LABEL: Record<FeedbackRating, string> = {
  great: 'Great',
  good: 'Good',
  needs_work: 'Needs work',
};

const RATINGS: FeedbackRating[] = ['great', 'good', 'needs_work'];

const CRITERIA = [
  { label: 'Content', max: 8 },
  { label: 'Clarity', max: 4 },
  { label: 'Evidence', max: 4 },
  { label: 'Engagement', max: 4 },
];

interface FeedbackPanelProps {
  post: ForumPost;
  onSave: (feedback: PostFeedback) => void;
  onCancel: () => void;
}

export default function FeedbackPanel({ post, onSave, onCancel }: FeedbackPanelProps) {
  const saved = post.feedbackDetail;
  const [rating, setRating] = useState<FeedbackRating>(saved?.rating ?? 'great');
  const [criterion, setCriterion] = useState(saved?.criterion ?? CRITERIA[0].label);
  const [marks, setMarks] = useState(saved?.marks != null ? String(saved.marks) : '');
  const [note, setNote] = useState(saved?.note ?? post.feedback ?? '');
  const [visible, setVisible] = useState(saved?.visible ?? true);
  const ratingRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const groupName = useId();
  const criterionId = useId();
  const marksId = useId();
  const marksErrorId = useId();
  const noteId = useId();

  const selected = CRITERIA.find((c) => c.label === criterion) ?? CRITERIA[0];
  const trimmedMarks = marks.trim();
  const marksValue = trimmedMarks === '' ? null : Number(trimmedMarks);
  const marksError =
    marksValue !== null && (Number.isNaN(marksValue) || marksValue < 0 || marksValue > selected.max)
      ? `Enter a mark from 0 to ${selected.max}`
      : null;
  const canSave = note.trim() !== '' && !marksError;

  useEffect(() => {
    ratingRef.current?.focus();
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSave) return;
    onSave({
      rating,
      criterion: selected.label,
      max: selected.max,
      marks: marksValue,
      note: note.trim(),
      visible,
    });
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
        <NotebookPen size={18} strokeWidth={1.75} aria-hidden />
        Feedback on this post
      </h4>

      <div role="radiogroup" aria-label="Overall rating" className={styles.ratings}>
        {RATINGS.map((value) => (
          <label key={value} className={styles.rating}>
            <input
              ref={rating === value ? ratingRef : undefined}
              type="radio"
              name={groupName}
              className={styles.ratingInput}
              checked={rating === value}
              onChange={() => setRating(value)}
            />
            <span className={styles.ratingFace}>{FEEDBACK_RATING_LABEL[value]}</span>
          </label>
        ))}
      </div>

      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor={criterionId} className={styles.label}>
            Criterion
          </label>
          <div className={styles.selectWrap}>
            <select
              id={criterionId}
              className={styles.select}
              value={selected.label}
              onChange={(e) => setCriterion(e.target.value)}
            >
              {CRITERIA.map((c) => (
                <option key={c.label} value={c.label}>
                  {c.label} /{c.max}
                </option>
              ))}
            </select>
            <ChevronDown size={20} strokeWidth={1.75} className={styles.chevron} aria-hidden />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor={marksId} className={styles.label}>
            Marks (optional)
          </label>
          <input
            id={marksId}
            type="text"
            inputMode="decimal"
            className={styles.text}
            placeholder={`e.g. ${Math.max(1, selected.max - 2)}`}
            value={marks}
            aria-invalid={marksError ? true : undefined}
            aria-describedby={marksError ? marksErrorId : undefined}
            onChange={(e) => setMarks(e.target.value)}
          />
          {marksError && (
            <span id={marksErrorId} className={styles.error}>
              {marksError}
            </span>
          )}
        </div>
      </div>

      <label htmlFor={noteId} className={styles.srOnly}>
        Next step for {post.author.name}
      </label>
      <textarea
        id={noteId}
        className={styles.input}
        rows={3}
        placeholder="One clear next step..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <label className={styles.option}>
        <input
          type="checkbox"
          className={styles.checkInput}
          checked={visible}
          onChange={(e) => setVisible(e.target.checked)}
        />
        <span className={styles.checkBox} aria-hidden="true">
          <Check size={13} strokeWidth={3} />
        </span>
        Show to learner now
      </label>

      <div className={styles.footer}>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={styles.save} disabled={!canSave}>
          Save feedback
        </button>
      </div>
    </form>
  );
}