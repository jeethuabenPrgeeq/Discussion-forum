'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Copy, Link as LinkIcon } from 'lucide-react';
import { ROLE_HOME } from '@/features/auth/lib/session';
import styles from './LinkPanel.module.css';

type Scope = 'post' | 'topic';

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

interface LinkPanelProps {
  topicId: string;
  postId: string;
  viewer?: boolean;
  onCopied: (message: string) => void;
  onClose: () => void;
}

export default function LinkPanel({ topicId, postId, viewer = false, onCopied, onClose }: LinkPanelProps) {
  const [scope, setScope] = useState<Scope>('post');
  const [requireSignIn, setRequireSignIn] = useState(true);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const copyRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const base = `${window.location.origin}${ROLE_HOME.learner}/topics/${topicId}`;
  const url = scope === 'post' ? `${base}#post-${postId}` : base;

  useEffect(() => {
    copyRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const changeScope = (next: Scope) => {
    setScope(next);
    setCopied(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onCopied(scope === 'post' ? 'Post link copied' : 'Topic link copied');
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
      onCopied('Press Ctrl+C to copy the link');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <section className={styles.panel} aria-labelledby={titleId} onKeyDown={handleKeyDown}>
      <h4 id={titleId} className={styles.title}>
        <LinkIcon size={18} strokeWidth={1.75} aria-hidden />
        Link to this post
      </h4>

      <div className={styles.row}>
        <input
          ref={inputRef}
          className={styles.url}
          value={url}
          readOnly
          aria-label="Shareable link"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button ref={copyRef} type="button" className={styles.copy} data-copied={copied || undefined} onClick={copy}>
          {copied ? <Check size={18} strokeWidth={2.25} aria-hidden /> : <Copy size={18} strokeWidth={1.75} aria-hidden />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className={styles.options}>
        <CheckOption
          label="Link to this post only"
          checked={scope === 'post'}
          onChange={(checked) => changeScope(checked ? 'post' : 'topic')}
        />
        <CheckOption
          label="Link to the whole topic"
          checked={scope === 'topic'}
          onChange={(checked) => changeScope(checked ? 'topic' : 'post')}
        />
        {!viewer && (
          <CheckOption label="Learners must sign in to open it" checked={requireSignIn} onChange={setRequireSignIn} />
        )}
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.close} onClick={onClose}>
          Close
        </button>
      </div>
    </section>
  );
}