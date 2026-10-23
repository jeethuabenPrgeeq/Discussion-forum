'use client';

import styles from './Toggle.module.css';

interface ToggleProps {
  id?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  'aria-describedby'?: string;
  'aria-label'?: string;
}

export default function Toggle({ id, checked, disabled, onChange, ...aria }: ToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={styles.toggle}
      onClick={() => onChange(!checked)}
      {...aria}
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.text}>{checked ? 'ON' : 'OFF'}</span>
        <span className={styles.knob} />
      </span>
    </button>
  );
}