import type { ReactNode } from 'react';
import type { PillTone } from '@/features/forum/lib/types';
import styles from './StatusPill.module.css';

interface StatusPillProps {
  tone: PillTone;
  size?: 'xs' | 'sm' | 'md';
  children: ReactNode;
}

export default function StatusPill({ tone, size = 'sm', children }: StatusPillProps) {
  return (
    <span className={styles.pill} data-tone={tone} data-size={size}>
      {children}
    </span>
  );
}