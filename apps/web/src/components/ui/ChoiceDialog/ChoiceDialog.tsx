'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import styles from './ChoiceDialog.module.css';

export interface ChoiceOption {
  value: string;
  label: string;
}

interface ChoiceDialogProps {
  open: boolean;
  title: string;
  description?: string;
  options: ChoiceOption[];
  value: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function ChoiceDialog({
  open,
  title,
  description,
  options,
  value,
  confirmLabel = 'Save',
  onConfirm,
  onCancel,
}: ChoiceDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(value);
  const titleId = useId();
  const descId = useId();
  const groupName = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setSelected(value);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, value]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selected === value) return;
    onConfirm(selected);
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
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
          {title}
        </h2>
        {description && (
          <p id={descId} className={styles.description}>
            {description}
          </p>
        )}

        <div role="radiogroup" aria-labelledby={titleId} className={styles.options}>
          {options.map((o) => (
            <label key={o.value} className={styles.option}>
              <input
                type="radio"
                name={groupName}
                className={styles.radioInput}
                checked={selected === o.value}
                autoFocus={selected === o.value}
                onChange={() => setSelected(o.value)}
              />
              <span className={styles.radio} aria-hidden="true" />
              <span className={styles.optionLabel}>{o.label}</span>
              {o.value === value && <span className={styles.current}>Current</span>}
            </label>
          ))}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className={styles.confirm} disabled={selected === value}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}