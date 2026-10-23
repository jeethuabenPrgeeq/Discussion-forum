'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from './MarkInput.module.css';

interface MarkInputProps {
  label: string;
  value: number | null;
  max: number;
  step?: number;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
  disabled?: boolean;
  invalid?: boolean;
}

const format = (value: number | null) => {
  if (value === null) return '';
  return Number.isInteger(value) && value >= 0 && value < 10 ? `0${value}` : String(value);
};

export default function MarkInput({ label, value, max, step = 1, onChange, readOnly, disabled, invalid }: MarkInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const nudge = (dir: 1 | -1) => {
    const next = Math.round(((value ?? 0) + dir * step) / step) * step;
    onChange?.(Math.min(max, Math.max(0, next)));
  };

  return (
    <span
      className={styles.box}
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
    >
      <input
        type="text"
        inputMode="decimal"
        className={styles.input}
        aria-label={label}
        aria-invalid={invalid || undefined}
        value={draft ?? format(value)}
        readOnly={readOnly}
        disabled={disabled}
        onFocus={() => setDraft(format(value))}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          const text = e.target.value.trim();
          setDraft(text);
          if (text === '') {
            onChange?.(null);
            return;
          }
          const n = Number(text);
          if (!Number.isNaN(n)) onChange?.(n);
        }}
        onKeyDown={(e) => {
          if (readOnly || disabled) return;
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            nudge(1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            nudge(-1);
          }
        }}
      />
      {!readOnly && (
        <span className={styles.stepper}>
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Increase ${label}`}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => nudge(1)}
          >
            <ChevronUp size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Decrease ${label}`}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => nudge(-1)}
          >
            <ChevronDown size={14} strokeWidth={1.5} />
          </button>
        </span>
      )}
    </span>
  );
}