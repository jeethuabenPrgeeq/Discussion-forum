'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './NeuDatePicker.module.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const POPUP_WIDTH = 340;
const GAP = 8;

type View = 'days' | 'months' | 'years';

const pad = (n: number) => String(n).padStart(2, '0');
const toValue = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

const parse = (v: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return { y: Number(v.slice(0, 4)), m: Number(v.slice(5, 7)) - 1, d: Number(v.slice(8, 10)) };
};

const todayValue = () => {
  const t = new Date();
  return toValue(t.getFullYear(), t.getMonth(), t.getDate());
};

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

interface NeuDatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  min?: string;
  placeholder?: string;
  label?: string;
}

export default function NeuDatePicker({ id, value, onChange, disabled, min, placeholder = 'dd-mm-yyyy', label = 'date' }: NeuDatePickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('days');
  const [cursor, setCursor] = useState(() => {
    const p = parse(value) ?? parse(todayValue())!;
    return { y: p.y, m: p.m };
  });
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const selected = parse(value);
  const today = todayValue();
  const minValue = min && parse(min) ? min : '';

  const isDayDisabled = (v: string) => !!minValue && v < minValue;
  const isMonthDisabled = (y: number, m: number) => !!minValue && toValue(y, m, daysIn(y, m)) < minValue;
  const isYearDisabled = (y: number) => !!minValue && `${y}-12-31` < minValue;

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const popup = popupRef.current;
    if (!trigger || !popup) return;
    const rect = trigger.getBoundingClientRect();
    const height = popup.offsetHeight;
    const left = Math.min(Math.max(GAP, rect.right - POPUP_WIDTH), window.innerWidth - POPUP_WIDTH - GAP);
    const below = rect.bottom + GAP;
    const above = rect.top - GAP - height;
    let top = below;
    if (below + height > window.innerHeight - GAP) {
      top = above >= GAP ? above : Math.max(GAP, window.innerHeight - height - GAP);
    }
    setPos({ top, left: Math.max(GAP, left) });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, view, cursor, place]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popupRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    const frame = window.requestAnimationFrame(place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  const openPicker = () => {
    if (disabled) return;
    const p = parse(value) ?? parse(today)!;
    setCursor({ y: p.y, m: p.m });
    setView('days');
    setPos(null);
    setOpen((o) => !o);
  };

  const shiftMonth = (delta: number) =>
    setCursor((c) => {
      const date = new Date(c.y, c.m + delta, 1);
      return { y: date.getFullYear(), m: date.getMonth() };
    });

  const pick = (v: string) => {
    if (isDayDisabled(v)) return;
    onChange(v);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const firstWeekday = new Date(cursor.y, cursor.m, 1).getDay();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(cursor.y, cursor.m, i - firstWeekday + 1);
    return {
      value: toValue(date.getFullYear(), date.getMonth(), date.getDate()),
      day: date.getDate(),
      outside: date.getMonth() !== cursor.m,
    };
  });

  const yearStart = Math.floor(cursor.y / 12) * 12;
  const years = Array.from({ length: 12 }, (_, i) => yearStart + i);
  const shown = selected ? `${pad(selected.d)}-${pad(selected.m + 1)}-${selected.y}` : '';

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={styles.trigger}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openPicker}
      >
        <span className={shown ? styles.value : styles.placeholder}>{shown || placeholder}</span>
        <CalendarDays size={24} strokeWidth={1.5} className={styles.icon} aria-hidden />
      </button>

      {open &&
        createPortal(
          <div
            ref={popupRef}
            className={styles.popup}
            role="dialog"
            aria-label={`Choose ${label}`}
            style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
          >
            <div className={styles.header}>
              <button type="button" className={styles.nav} onClick={() => (view === 'years' ? setCursor((c) => ({ ...c, y: c.y - 1 })) : shiftMonth(-1))} aria-label="Previous">
                <ChevronLeft size={20} strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                className={styles.pill}
                data-active={view === 'months' || undefined}
                aria-label="Choose month"
                onClick={() => setView(view === 'months' ? 'days' : 'months')}
              >
                {MONTHS[cursor.m]}
                <ChevronDown size={16} strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                className={styles.pill}
                data-active={view === 'years' || undefined}
                aria-label="Choose year"
                onClick={() => setView(view === 'years' ? 'days' : 'years')}
              >
                {cursor.y}
                <ChevronDown size={16} strokeWidth={1.75} aria-hidden />
              </button>
              <button type="button" className={styles.nav} onClick={() => (view === 'years' ? setCursor((c) => ({ ...c, y: c.y + 1 })) : shiftMonth(1))} aria-label="Next">
                <ChevronRight size={20} strokeWidth={1.75} aria-hidden />
              </button>
            </div>

            {view === 'days' && (
              <div className={styles.days} role="grid" aria-label={`${MONTH_NAMES[cursor.m]} ${cursor.y}`}>
                {DAYS.map((d) => (
                  <span key={d} className={styles.dayLabel} role="columnheader">
                    {d}
                  </span>
                ))}
                {cells.map((c) => {
                  const off = isDayDisabled(c.value);
                  const isSelected = c.value === value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      className={cx(styles.cell, c.outside && styles.outside, c.value === today && styles.today)}
                      data-selected={isSelected || undefined}
                      disabled={off}
                      aria-pressed={isSelected}
                      onClick={() => pick(c.value)}
                    >
                      {c.day}
                    </button>
                  );
                })}
              </div>
            )}

            {view === 'months' && (
              <div className={styles.options}>
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    className={styles.option}
                    data-selected={i === cursor.m || undefined}
                    disabled={isMonthDisabled(cursor.y, i)}
                    onClick={() => {
                      setCursor((c) => ({ ...c, m: i }));
                      setView('days');
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            {view === 'years' && (
              <>
                <div className={styles.range}>
                  <button type="button" className={styles.round} onClick={() => setCursor((c) => ({ ...c, y: c.y - 12 }))} aria-label="Previous years">
                    <ChevronLeft size={20} strokeWidth={1.75} aria-hidden />
                  </button>
                  <span className={styles.rangeLabel}>
                    {yearStart} - {yearStart + 11}
                  </span>
                  <button type="button" className={styles.round} onClick={() => setCursor((c) => ({ ...c, y: c.y + 12 }))} aria-label="Next years">
                    <ChevronRight size={20} strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
                <div className={styles.options}>
                  {years.map((y) => (
                    <button
                      key={y}
                      type="button"
                      className={styles.option}
                      data-selected={y === cursor.y || undefined}
                      disabled={isYearDisabled(y)}
                      onClick={() => {
                        setCursor((c) => ({ ...c, y }));
                        setView('months');
                      }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}