'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { textToHtml } from '@/features/forum/lib/text';
import styles from './InlineReply.module.css';

interface InlineReplyProps {
  authorName: string;
  onSend: (html: string) => void;
  onClose: () => void;
}

export default function InlineReply({ authorName, onSend, onClose }: InlineReplyProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();
  const empty = !text.trim();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = () => {
    if (empty) return;
    onSend(textToHtml(text));
    setText('');
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    send();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <form className={styles.box} onSubmit={handleSubmit}>
      <label htmlFor={inputId} className={styles.srOnly}>
        Reply to {authorName}
      </label>
      <textarea
        ref={inputRef}
        id={inputId}
        className={styles.input}
        rows={3}
        placeholder="Write a reply..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button type="submit" className={styles.send} disabled={empty}>
        Send reply
      </button>
    </form>
  );
}