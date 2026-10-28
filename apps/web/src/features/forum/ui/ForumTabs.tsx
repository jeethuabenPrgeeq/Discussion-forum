'use client';

import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import type { ForumTabKey } from '@/features/forum/lib/types';
import styles from './ForumTabs.module.css';

export type ShellTabKey = ForumTabKey | 'questions';

export const FORUM_TABS: { key: ShellTabKey; label: string }[] = [
  { key: 'forum', label: 'Forum' },
  { key: 'settings', label: 'Settings' },
  { key: 'people', label: 'People' },
  { key: 'grades', label: 'Grades' },
  { key: 'reports', label: 'Reports' },
  { key: 'questions', label: 'Questions' },
  { key: 'access', label: 'Access' },
];

interface ForumTabsProps {
  active: ShellTabKey;
  onChange: (key: ShellTabKey) => void;
}

export default function ForumTabs({ active, onChange }: ForumTabsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!scroller || !list || !indicator) return;

    const sync = () => {
      const tab = list.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!tab) return;
      const left = Math.max(0, tab.offsetLeft - 4);
      const width = tab.offsetWidth + 8;
      indicator.style.width = `${width}px`;
      indicator.style.transform = `translateX(${left}px)`;
      const viewEnd = scroller.scrollLeft + scroller.clientWidth;
      if (left < scroller.scrollLeft || left + width > viewEnd) {
        scroller.scrollTo({ left: left - 16, behavior: 'smooth' });
      }
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(list);
    return () => ro.disconnect();
  }, [active]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = FORUM_TABS.findIndex((t) => t.key === active);
    const last = FORUM_TABS.length - 1;
    const next =
      e.key === 'ArrowRight'
        ? (i + 1) % FORUM_TABS.length
        : e.key === 'ArrowLeft'
          ? (i - 1 + FORUM_TABS.length) % FORUM_TABS.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    const { key } = FORUM_TABS[next];
    onChange(key);
    requestAnimationFrame(() => document.getElementById(`forum-tab-${key}`)?.focus());
  };

  return (
    <div ref={scrollerRef} className={styles.scroller}>
      <div className={styles.inner}>
        <div ref={listRef} role="tablist" aria-label="Forum sections" className={styles.list} onKeyDown={onKeyDown}>
          {FORUM_TABS.map(({ key, label }) => {
            const selected = key === active;
            return (
              <button
                key={key}
                id={`forum-tab-${key}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`forum-panel-${key}`}
                tabIndex={selected ? 0 : -1}
                className={styles.tab}
                data-text={label}
                onClick={() => onChange(key)}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className={styles.track}>
          <span ref={indicatorRef} className={styles.indicator} />
        </div>
      </div>
    </div>
  );
}