'use client';

import { useId, type ReactNode } from 'react';
import { ArrowDownIcon } from '@/components/icons';
import styles from './Accordion.module.css';

interface AccordionSectionProps {
  title: string;
  icon: ReactNode;
  tone?: 'blue' | 'orange' | 'red' | 'olive';
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export default function AccordionSection({ title, icon, tone = 'blue', open, onToggle, children }: AccordionSectionProps) {
  const id = useId();

  return (
    <section className={styles.section} data-open={open || undefined}>
      <h3 className={styles.heading}>
        <button
          type="button"
          id={`${id}-button`}
          className={styles.header}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
        >
          <span className={styles.icon} data-tone={tone} aria-hidden="true">
            {icon}
          </span>
          <span className={styles.title}>{title}</span>
          <ArrowDownIcon size={28} strokeWidth={2} className={styles.chevron} />
        </button>
      </h3>
      <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-button`} className={styles.panel} hidden={!open}>
        {open && children}
      </div>
    </section>
  );
}