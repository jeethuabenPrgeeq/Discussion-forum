'use client';

import { useId, type ReactNode, type Ref } from 'react';
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import RichTextEditor from '@/components/editor/RichTextEditor';
import Select, { type SelectOption } from '@/components/form/Select';
import Toggle from '@/components/form/Toggle';
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

export function DateTimeField({ label, value, onChange, error, type = 'datetime-local' }: DateTimeFieldProps) {
  const id = useId();
  return (
    <Field id={id} label={label} htmlFor={`${id}-control`} error={error}>
      <div className={styles.control} data-invalid={error ? true : undefined}>
        <input
          id={`${id}-control`}
          type={type}
          className={styles.dateInput}
          value={value}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        <CalendarDays size={24} strokeWidth={1.5} className={styles.trailingIcon} aria-hidden />
      </div>
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

export function NumberField({ label, value, onChange, min = 0, max, step = 1, pad = 0, error }: NumberFieldProps) {
  const id = useId();
  const clamp = (n: number) => Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, n));

  return (
    <Field id={id} label={label} htmlFor={`${id}-control`} error={error}>
      <div className={styles.control} data-invalid={error ? true : undefined}>
        <input
          id={`${id}-control`}
          type="number"
          inputMode="numeric"
          className={styles.numberInput}
          value={pad ? String(value).padStart(pad, '0') : value}
          min={min}
          max={max}
          step={step}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n)) onChange(clamp(n));
          }}
        />
        <div className={styles.stepper}>
          <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(clamp(value + step))}>
            <ChevronUp size={14} strokeWidth={1.75} />
          </button>
          <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(clamp(value - step))}>
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