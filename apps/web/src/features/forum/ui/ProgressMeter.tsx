import styles from './ProgressMeter.module.css';

interface ProgressMeterProps {
  value: number;
  total: number;
  label: string;
}

export default function ProgressMeter({ value, total, label }: ProgressMeterProps) {
  const done = value >= total;
  const ratio = total > 0 ? Math.min(value / total, 1) : 1;
  return (
    <span className={styles.meter} data-done={done || undefined}>
      <span className={styles.track} role="img" aria-label={`${value} of ${total} ${label}`}>
        <span className={styles.fill} style={{ width: `${ratio * 100}%` }} />
      </span>
      <span className={styles.value} aria-hidden>
        {value} of {total}
      </span>
    </span>
  );
}