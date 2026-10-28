'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Pencil } from 'lucide-react';
import { htmlToText, textToHtml } from '@/features/forum/lib/text';
import type { ForumPost } from '@/features/forum/lib/types';
import styles from './EditPanel.module.css';

const REASONS = ['Typo fix', 'Clarity', 'Formatting', 'Incorrect information', 'Policy violation', 'Other'] as const;

export interface PostEdit {
  html: string;
  reason: string;
  notify: boolean;
  showTag: boolean;
}

interface EditPanelProps {
  post: ForumPost;
  simple?: boolean;
  onSave: (edit: PostEdit) => void;
  onCancel: () => void;
}

export default function EditPanel({ post, simple = false, onSave, onCancel }: EditPanelProps) {
  const [initialText] = useState(() => htmlToText(post.body));
  const [text, setText] = useState(initialText);
  const [reason, setReason] = useState<string>(post.editReason ?? REASONS[0]);
  const [notify, setNotify] = useState(true);
  const [showTag, setShowTag] = useState(!post.hideEditTag);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const reasonId = useId();
  const notifyId = useId();
  const empty = !text.trim();
  const textChanged = text.trim() !== initialText.trim();
  const changed = simple ? textChanged : textChanged || showTag !== !post.hideEditTag;
  const canSave = !empty && changed;

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, []);

  const save = () => {
    if (!canSave) return;
    onSave(
      simple
        ? { html: textToHtml(text), reason: '', notify: false, showTag: true }
        : { html: textToHtml(text), reason, notify, showTag },
    );
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    save();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      save();
    }
  };

  return (
    <form className={styles.panel} aria-labelledby={titleId} onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <h4 id={titleId} className={styles.title}>
        <Pencil size={18} strokeWidth={1.75} aria-hidden />
        Edit post
      </h4>

      <label htmlFor={bodyId} className={styles.srOnly}>
        Post text
      </label>
      <textarea
        ref={inputRef}
        id={bodyId}
        className={styles.input}
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {!simple && (
        <>
          <div className={styles.fields}>
            <div className={styles.field}>
              <label htmlFor={reasonId} className={styles.label}>
                Reason
              </label>
              <div className={styles.selectWrap}>
                <select id={reasonId} className={styles.select} value={reason} onChange={(e) => setReason(e.target.value)}>
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
              <label htmlFor={notifyId} className={styles.label}>
                Notify author
              </label>
              <div className={styles.selectWrap}>
                <select
                  id={notifyId}
                  className={styles.select}
                  value={notify ? 'yes' : 'no'}
                  onChange={(e) => setNotify(e.target.value === 'yes')}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <ChevronDown size={20} strokeWidth={1.75} className={styles.chevron} aria-hidden />
              </div>
            </div>
          </div>

          <label className={styles.option}>
            <input
              type="checkbox"
              className={styles.checkInput}
              checked={showTag}
              onChange={(e) => setShowTag(e.target.checked)}
            />
            <span className={styles.checkBox} aria-hidden="true">
              <Check size={13} strokeWidth={3} />
            </span>
            Show an &quot;Edited by instructor&quot; tag
          </label>
        </>
      )}

      <div className={styles.footer}>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={styles.save} disabled={!canSave}>
          Save changes
        </button>
      </div>
    </form>
  );
}