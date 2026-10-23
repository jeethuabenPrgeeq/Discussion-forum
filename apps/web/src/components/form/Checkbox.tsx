'use client';

import { Check } from 'lucide-react';
import styles from './Checkbox.module.css';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function Checkbox({ label, checked, onChange, disabled }: CheckboxProps) {
  return (
    <label className={styles.root} data-disabled={disabled || undefined}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.box} aria-hidden>
        <span className={styles.mark}>
          <Check size={12} strokeWidth={3} />
        </span>
      </span>
      <span className={styles.label}>{label}</span>
    </label>
  );
}