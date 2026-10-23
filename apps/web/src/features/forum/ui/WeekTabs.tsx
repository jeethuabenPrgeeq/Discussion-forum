'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/icons';
import type { ForumWeek } from '@/features/forum/lib/types';
import styles from './WeekTabs.module.css';

interface WeekTabsProps {
  weeks: ForumWeek[];
  activeId: string;
  onChange: (id: string) => void;
}

export default function WeekTabs({ weeks, activeId, onChange }: WeekTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const index = weeks.findIndex((w) => w.id === activeId);

  useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !tab) return;
    list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2, behavior: 'smooth' });
    if (list.contains(document.activeElement)) tab.focus({ preventScroll: true });
  }, [activeId]);

  const go = (step: number) => {
    const next = weeks[index + step];
    if (next) onChange(next.id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else return;
    e.preventDefault();
  };

  return (
    <nav className={styles.root} aria-label="Course weeks">
      <button type="button" className={styles.arrow} onClick={() => go(-1)} disabled={index <= 0} aria-label="Previous week">
        <ArrowLeftIcon />
      </button>

      <div ref={listRef} className={styles.list} role="tablist" aria-label="Weeks" onKeyDown={onKeyDown}>
        {weeks.map((w) => {
          const selected = w.id === activeId;
          return (
            <button
              key={w.id}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className={styles.tab}
              data-text={w.label}
              onClick={() => onChange(w.id)}
            >
              {w.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className={styles.arrow}
        onClick={() => go(1)}
        disabled={index >= weeks.length - 1}
        aria-label="Next week"
      >
        <ArrowRightIcon />
      </button>
    </nav>
  );
}