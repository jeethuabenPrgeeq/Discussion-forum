'use client';

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Check, MessageCircleMore, Paperclip, X } from 'lucide-react';
import styles from './MessagePersonDialog.module.css';

const MAX_FILES = 3;

export interface PersonMessagePayload {
  subject: string;
  message: string;
  email: boolean;
  allowReply: boolean;
  attachments: File[];
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

interface MessagePersonDialogProps {
  open: boolean;
  personName: string;
  initials: string;
  subtitle: string;
  onSend: (payload: PersonMessagePayload) => void;
  onCancel: () => void;
}

export default function MessagePersonDialog({
  open,
  personName,
  initials,
  subtitle,
  onSend,
  onCancel,
}: MessagePersonDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(true);
  const [allowReply, setAllowReply] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const titleId = useId();
  const subjectId = useId();
  const messageId = useId();
  const canSend = subject.trim() !== '' && message.trim() !== '';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setSubject('');
      setMessage('');
      setEmail(true);
      setAllowReply(true);
      setFiles([]);
      dialog.showModal();
      subjectRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const addFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    setFiles((current) => [...current, ...picked].slice(0, MAX_FILES));
  };

  const removeFile = (index: number) => setFiles((current) => current.filter((_, i) => i !== index));

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSend) return;
    onSend({ subject: subject.trim(), message: message.trim(), email, allowReply, attachments: files });
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
          <MessageCircleMore size={20} strokeWidth={1.75} aria-hidden />
          Message
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
          <label htmlFor={subjectId} className={styles.label}>
            Subject
          </label>
          <input
            ref={subjectRef}
            id={subjectId}
            type="text"
            className={styles.text}
            placeholder="Short and clear"
            maxLength={120}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={messageId} className={styles.label}>
            Message
          </label>
          <textarea
            id={messageId}
            className={styles.input}
            rows={4}
            placeholder="Write your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {files.length > 0 && (
          <ul className={styles.files} aria-label="Attachments">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className={styles.file}>
                <span className={styles.fileName} title={file.name}>
                  {file.name}
                </span>
                <button
                  type="button"
                  className={styles.fileRemove}
                  aria-label={`Remove ${file.name}`}
                  onClick={() => removeFile(index)}
                >
                  <X size={14} strokeWidth={2} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.options}>
          <CheckOption label="Also send by email" checked={email} onChange={setEmail} />
          <CheckOption label="Let them reply" checked={allowReply} onChange={setAllowReply} />
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.attach}
            onClick={() => fileRef.current?.click()}
            disabled={files.length >= MAX_FILES}
          >
            <Paperclip size={18} strokeWidth={1.5} aria-hidden />
            Attach
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className={styles.srOnly}
            tabIndex={-1}
            aria-hidden
            onChange={addFiles}
          />
          <div className={styles.actionsRight}>
            <button type="button" className={styles.cancel} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.send} disabled={!canSend}>
              Send message
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}