'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Check, LockKeyhole } from 'lucide-react';
import { textToHtml } from '@/features/forum/lib/text';
import styles from './PrivateReplyPanel.module.css';

export interface PrivateReplyPayload {
  html: string;
  emailCopy: boolean;
  allowReplyBack: boolean;
}

interface CheckOptionProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CheckOption({ label, checked, onChange }: CheckOptionProps) {
  return (
    <label className={styles.option}>
      <input
        type="checkbox"
        className={styles.checkInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.checkBox} aria-hidden="true">
        <Check size={13} strokeWidth={3} />
      </span>
      {label}
    </label>
  );
}

interface PrivateReplyPanelProps {
  recipientName: string;
  onSend: (payload: PrivateReplyPayload) => void;
  onCancel: () => void;
}

export default function PrivateReplyPanel({ recipientName, onSend, onCancel }: PrivateReplyPanelProps) {
  const [text, setText] = useState('');
  const [emailCopy, setEmailCopy] = useState(true);
  const [allowReplyBack, setAllowReplyBack] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const inputId = useId();
  const noteId = useId();
  const firstName = recipientName.trim().split(/\s+/)[0];
  const empty = !text.trim();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = () => {
    if (empty) return;
    onSend({ html: textToHtml(text), emailCopy, allowReplyBack });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    send();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send();
    }
  };

  return (
    <form className={styles.panel} aria-labelledby={titleId} onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <h4 id={titleId} className={styles.title}>
        <LockKeyhole size={18} strokeWidth={1.75} aria-hidden />
        Private reply
      </h4>

      <div className={styles.recipient}>
        <span className={styles.chip}>To: {recipientName}</span>
        <span id={noteId} className={styles.note}>
          Only {firstName} and instructors can see it
        </span>
      </div>

      <label htmlFor={inputId} className={styles.srOnly}>
        Private message to {recipientName}
      </label>
      <textarea
        ref={inputRef}
        id={inputId}
        className={styles.input}
        rows={4}
        placeholder="Write a private message..."
        aria-describedby={noteId}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className={styles.options}>
        <CheckOption label="Email them too" checked={emailCopy} onChange={setEmailCopy} />
        <CheckOption label="Let them reply back" checked={allowReplyBack} onChange={setAllowReplyBack} />
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={styles.send} disabled={empty}>
          Send privately
        </button>
      </div>
    </form>
  );
}