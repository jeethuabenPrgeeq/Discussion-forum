'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import RichTextEditor from '@/components/editor/RichTextEditor';
import Select, { type SelectOption } from '@/components/form/Select';
import Toggle from '@/components/form/Toggle';
import DateCalendar from '@/components/form/DateCalendar';
import calendarStyles from './DateCalendar.module.css';
import styles from './FormFields.module.css';

interface FieldProps {
  id: string;
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ id, label, htmlFor, error, children }: FieldProps) {
  return (
    <div className={styles.field}>
      {htmlFor ? (
        <label id={`${id}-label`} htmlFor={htmlFor} className={styles.label}>
          {label}
        </label>
      ) : (
        <span id={`${id}-label`} className={styles.label}>
          {label}
        </span>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  error?: string;
}

export function SelectField<T extends string>({ label, value, options, onChange, error }: SelectFieldProps<T>) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error}>
      <Select
        id={`${id}-control`}
        variant="field"
        labelledBy={`${id}-label`}
        value={value}
        options={options}
        onChange={onChange}
      />
    </Field>
  );
}

interface SwitchFieldProps {
  label: string;
  text: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function SwitchField({ label, text, checked, onChange, disabled }: SwitchFieldProps) {
  const id = useId();
  return (
    <Field id={id} label={label}>
      <label className={styles.control} data-switch data-disabled={disabled || undefined}>
        <span className={styles.switchText}>{text}</span>
        <Toggle
          id={`${id}-control`}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          aria-describedby={`${id}-label`}
        />
      </label>
    </Field>
  );
}

interface DateTimeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: 'date' | 'datetime-local';
}

const DEFAULT_TIME = '09:00';
const PAST_ERROR = 'Choose a date and time from now on.';

const pad2 = (n: number) => String(n).padStart(2, '0');

function nowMinute() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

const withTime = (value: string) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T${DEFAULT_TIME}` : value.slice(0, 16));

export function DateTimeField({ label, value, onChange, error }: DateTimeFieldProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const shownValue = withTime(value);
  const shownError = localError ?? error;

  const handleTyped = (next: string) => {
    if (next && next < nowMinute()) {
      setLocalError(PAST_ERROR);
      return;
    }
    setLocalError(null);
    onChange(next);
  };

  const pickDateTime = (dateTime: string) => {
    setLocalError(null);
    onChange(dateTime);
  };

  const closeCalendar = () => {
    setCalendarOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <Field id={id} label={label} htmlFor={`${id}-control`} error={shownError ?? undefined}>
      <div className={styles.control} data-invalid={shownError ? true : undefined}>
        <input
          id={`${id}-control`}
          type="datetime-local"
          className={`${styles.dateInput} ${calendarStyles.nativeInput}`}
          value={shownValue}
          aria-invalid={!!shownError}
          aria-describedby={shownError ? `${id}-error` : undefined}
          onChange={(e) => handleTyped(e.target.value)}
        />
        <button
          ref={triggerRef}
          type="button"
          className={calendarStyles.trigger}
          aria-label={`Open calendar for ${label}`}
          aria-haspopup="dialog"
          aria-expanded={calendarOpen}
          onClick={() => setCalendarOpen(true)}
        >
          <CalendarDays size={24} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
      {calendarOpen && (
        <DateCalendar
          value={shownValue.slice(0, 10)}
          time={shownValue.slice(11, 16)}
          onChange={pickDateTime}
          onClose={closeCalendar}
          label={label}
        />
      )}
    </Field>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  pad?: number;
  error?: string;
}

const decimalsOf = (n: number) => (String(n).split('.')[1] ?? '').length;

export function NumberField({ label, value, onChange, min = 0, max, step = 1, pad = 0, error }: NumberFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const decimals = decimalsOf(step);
  const pattern = new RegExp(`^${min < 0 ? '-?' : ''}\\d*${decimals ? '(\\.\\d*)?' : ''}$`);

  const clamp = (n: number) =>
    Number(Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, n)).toFixed(decimals));

  const inRange = (n: number) => n >= min && (max === undefined || n <= max);

  const format = (n: number) => {
    const abs = Math.abs(n).toFixed(decimals);
    const padded = pad ? abs.padStart(pad, '0') : abs;
    return n < 0 ? `-${padded}` : padded;
  };

  const current = () => {
    if (draft === null) return value;
    const n = Number(draft);
    return draft !== '' && Number.isFinite(n) ? n : value;
  };

  const stepBy = (dir: 1 | -1) => {
    setDraft(null);
    onChange(clamp(current() + dir * step));
  };

  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    onChange(draft === '' || !Number.isFinite(n) ? clamp(min) : clamp(n));
    setDraft(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      stepBy(1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      stepBy(-1);
    } else if (e.key === 'Enter') {
      commit();
    }
  };

  const shown = current();
  const atMin = shown <= min;
  const atMax = max !== undefined && shown >= max;

  return (
    <Field id={id} label={label} htmlFor={`${id}-control`} error={error}>
      <div className={styles.control} data-invalid={error ? true : undefined}>
        <input
          id={`${id}-control`}
          type="text"
          role="spinbutton"
          inputMode={decimals ? 'decimal' : 'numeric'}
          autoComplete="off"
          className={styles.numberInput}
          value={draft ?? format(value)}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => {
            const raw = e.target.value;
            if (!pattern.test(raw)) return;
            const n = Number(raw);
            if (raw !== '' && Number.isFinite(n) && max !== undefined && n > max) return;
            setDraft(raw);
            if (raw !== '' && Number.isFinite(n) && inRange(n)) onChange(n);
          }}
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
        <div className={styles.stepper}>
          <button
            type="button"
            aria-label={`Increase ${label}`}
            disabled={atMax}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => stepBy(1)}
          >
            <ChevronUp size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label={`Decrease ${label}`}
            disabled={atMin}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => stepBy(-1)}
          >
            <ChevronDown size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </Field>
  );
}

interface EditorFieldProps {
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function EditorField({ label, value, onChange, placeholder }: EditorFieldProps) {
  const id = useId();
  return (
    <Field id={id} label={label}>
      <RichTextEditor variant="inset" label={label} placeholder={placeholder} initialHTML={value} onChange={onChange} />
    </Field>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email';
  icon?: ReactNode;
  error?: string;
  autoComplete?: string;
  maxLength?: number;
  inputRef?: Ref<HTMLInputElement>;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon,
  error,
  autoComplete,
  maxLength,
  inputRef,
}: TextFieldProps) {
  const id = useId();
  return (
    <Field id={id} label={label} htmlFor={`${id}-control`} error={error}>
      <div className={styles.control} data-invalid={error ? true : undefined}>
        {icon && (
          <span className={styles.leadingIcon} aria-hidden>
            {icon}
          </span>
        )}
        <input
          ref={inputRef}
          id={`${id}-control`}
          type={type}
          className={styles.textInput}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Field>
  );
}

interface ReadOnlyFieldProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
  muted?: boolean;
}

export function ReadOnlyField({ label, value, icon, trailing, muted }: ReadOnlyFieldProps) {
  const id = useId();
  return (
    <Field id={id} label={label}>
      <div className={styles.control} role="group" aria-labelledby={`${id}-label`}>
        {icon && (
          <span className={styles.leadingIcon} aria-hidden>
            {icon}
          </span>
        )}
        <span className={styles.readonlyValue} data-muted={muted || undefined}>
          {value}
        </span>
        {trailing && (
          <span className={styles.readonlyTrailing} aria-hidden>
            {trailing}
          </span>
        )}
      </div>
    </Field>
  );
}