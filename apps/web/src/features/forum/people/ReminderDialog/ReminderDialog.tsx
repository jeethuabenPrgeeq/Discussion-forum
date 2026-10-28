'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { BellRing, Check, ChevronDown } from 'lucide-react';
import styles from './ReminderDialog.module.css';

export type ReminderReason = 'post-soon' | 'replies' | 'not-started' | 'custom';
export type ReminderWhen = 'now' | 'tomorrow' | 'deadline';

export interface ReminderPayload {
  reason: ReminderReason;
  when: ReminderWhen;
  message: string;
  email: boolean;
  inApp: boolean;
}

export interface ReminderTemplate {
  postDue: string;
  repliesDue: string;
  repliesRequired: number;
}

const REASONS: { value: ReminderReason; label: string }[] = [
  { value: 'post-soon', label: 'Post is due soon' },
  { value: 'replies', label: 'Replies are due' },
  { value: 'not-started', label: 'Not started yet' },
  { value: 'custom', label: 'Custom' },
];

const WHEN_OPTIONS: { value: ReminderWhen; label: string }[] = [
  { value: 'now', label: 'Send now' },
  { value: 'tomorrow', label: 'Tomorrow 9 AM' },
  { value: 'deadline', label: 'Before the deadline' },
];

function templateFor(reason: ReminderReason, t: ReminderTemplate) {
  const replies = `${t.repliesRequired} ${t.repliesRequired === 1 ? 'reply' : 'replies'}`;
  switch (reason) {
    case 'post-soon':
      return `Your original post is due by ${t.postDue}. Please post it soon.`;
    case 'not-started':
      return `You haven't started this discussion yet. Please post your topic by ${t.postDue} and add ${replies} by ${t.repliesDue}.`;
    default:
      return '';
  }
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

interface ReminderDialogProps {
  open: boolean;
  personName: string;
  initials: string;
  subtitle: string;
  defaultReason: ReminderReason;
  template: ReminderTemplate;
  onSend: (payload: ReminderPayload) => void;
  onCancel: () => void;
}

export default function ReminderDialog({
  open,
  personName,
  initials,
  subtitle,
  defaultReason,
  template,
  onSend,
  onCancel,
}: ReminderDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reasonRef = useRef<HTMLSelectElement>(null);
  const [reason, setReason] = useState<ReminderReason>(defaultReason);
  const [when, setWhen] = useState<ReminderWhen>('now');
  const [message, setMessage] = useState(() => templateFor(defaultReason, template));
  const [email, setEmail] = useState(true);
  const [inApp, setInApp] = useState(true);
  const titleId = useId();
  const reasonId = useId();
  const whenId = useId();
  const messageId = useId();
  const canSend = message.trim() !== '' && (email || inApp);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setReason(defaultReason);
      setWhen('now');
      setMessage(templateFor(defaultReason, template));
      setEmail(true);
      setInApp(true);
      dialog.showModal();
      reasonRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, defaultReason, template]);

  const changeReason = (next: ReminderReason) => {
    setReason(next);
    setMessage(templateFor(next, template));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSend) return;
    onSend({ reason, when, message: message.trim(), email, inApp });
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <form className={styles.body} onSubmit={handleSubmit}>
        <h2 id={titleId} className={styles.title}>
          <BellRing size={20} strokeWidth={1.75} aria-hidden />
          Send reminder
        </h2>

        <div className={styles.person}>
          <span className={styles.avatar} aria-hidden="true">
            {initials}
          </span>
          <span className={styles.personText}>
            <span className={styles.personName}>{personName}</span>
            <span className={styles.personMeta}>{subtitle}</span>
          </span>
        </div>

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
              onChange={(e) => changeReason(e.target.value as ReminderReason)}
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <ChevronDown size={20} strokeWidth={1.75} className={styles.chevron} aria-hidden />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor={whenId} className={styles.label}>
            When
          </label>
          <div className={styles.selectWrap}>
            <select
              id={whenId}
              className={styles.select}
              value={when}
              onChange={(e) => setWhen(e.target.value as ReminderWhen)}
            >
              {WHEN_OPTIONS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
            <ChevronDown size={20} strokeWidth={1.75} className={styles.chevron} aria-hidden />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor={messageId} className={styles.label}>
            Message
          </label>
          <textarea
            id={messageId}
            className={styles.input}
            rows={3}
            placeholder={`Write a reminder for ${personName}...`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className={styles.options} role="group" aria-label="Send by">
          <CheckOption label="Email" checked={email} onChange={setEmail} />
          <CheckOption label="In-app notification" checked={inApp} onChange={setInApp} />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className={styles.send} disabled={!canSend}>
            Send reminder
          </button>
        </div>
      </form>
    </dialog>
  );
}