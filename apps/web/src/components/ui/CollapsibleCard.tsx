'use client';

import { useId, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './CollapsibleCard.module.css';

interface CollapsibleCardProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export default function CollapsibleCard({ title, open, onToggle, children }: CollapsibleCardProps) {
  const id = useId();
  return (
    <section className={styles.card} data-open={open || undefined}>
      <h3 className={styles.heading}>
        <button
          type="button"
          id={`${id}-button`}
          className={styles.header}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
        >
          <span className={styles.title}>{title}</span>
          <ChevronDown size={32} strokeWidth={2} className={styles.chevron} aria-hidden />
        </button>
      </h3>
      <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-button`} className={styles.panel} hidden={!open}>
        {open && children}
      </div>
    </section>
  );
}