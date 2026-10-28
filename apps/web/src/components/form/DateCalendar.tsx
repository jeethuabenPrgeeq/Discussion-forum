'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './DateCalendar.module.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_STEP = 5;
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);
const DAY_MINUTES = 24 * 60;
const DEFAULT_MINUTES = 9 * 60;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

type CalendarMode = 'days' | 'months' | 'years';
type CellType = 'prev' | 'curr' | 'next';
type Period = 'AM' | 'PM';

const pad = (value: number) => String(value).padStart(2, '0');
const toDateValue = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;
const toTimeValue = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const formatForScreenReader = (dateValue: string) =>
  new Date(`${dateValue}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

function parseMinutes(time: string) {
  if (!TIME_PATTERN.test(time)) return DEFAULT_MINUTES;
  const [h, m] = time.split(':').map(Number);
  return Math.min(h * 60 + Math.floor(m / MINUTE_STEP) * MINUTE_STEP, DAY_MINUTES - MINUTE_STEP);
}

function readNow() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    dateValue: toDateValue(now.getFullYear(), now.getMonth(), now.getDate()),
    firstSlot: Math.floor(minutes / MINUTE_STEP) * MINUTE_STEP + MINUTE_STEP,
  };
}

interface DateCalendarProps {
  value: string;
  time?: string;
  onChange: (dateTime: string) => void;
  onClose: () => void;
  label?: string;
}

export default function DateCalendar({ value, time = '', onChange, onClose, label }: DateCalendarProps) {
  const titleId = useId();
  const timeLabelId = useId();
  const [now, setNow] = useState(readNow);
  const todayAvailable = now.firstSlot < DAY_MINUTES;

  const isPastDate = (dateValue: string) =>
    dateValue < now.dateValue || (dateValue === now.dateValue && !todayAvailable);

  const validValue = DATE_PATTERN.test(value) ? value : '';
  const initial = validValue ? new Date(`${validValue}T00:00:00`) : new Date();

  const firstControlRef = useRef<HTMLButtonElement>(null);
  const activeYearRef = useRef<HTMLButtonElement>(null);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [mode, setMode] = useState<CalendarMode>('days');
  const [selected, setSelected] = useState(validValue && !isPastDate(validValue) ? validValue : '');
  const [minutes, setMinutes] = useState(() => parseMinutes(time));

  const selectedIsToday = selected === now.dateValue;
  const minMinutes = selectedIsToday ? now.firstSlot : 0;
  const shownMinutes = Math.max(minutes, minMinutes);

  useEffect(() => {
    firstControlRef.current?.focus();
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    const timer = window.setInterval(() => setNow(readNow()), 30_000);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      window.clearInterval(timer);
    };
  }, [onClose]);

  useEffect(() => {
    if (mode === 'years') activeYearRef.current?.scrollIntoView({ block: 'center' });
  }, [mode]);

  const monthIndex = viewYear * 12 + viewMonth;
  const currentMonthIndex = now.year * 12 + now.month;
  const canGoBack = monthIndex > currentMonthIndex;

  const prevMonth = () => {
    if (!canGoBack) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
      return;
    }
    setViewMonth((month) => month - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
      return;
    }
    setViewMonth((month) => month + 1);
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
  const cells: { day: number; type: CellType }[] = [];

  for (let index = firstDay - 1; index >= 0; index -= 1) cells.push({ day: daysInPrev - index, type: 'prev' });
  for (let day = 1; day <= daysInMonth; day += 1) cells.push({ day, type: 'curr' });
  for (let day = 1; cells.length < 42; day += 1) cells.push({ day, type: 'next' });

  const startYear = Math.min(viewYear, now.year);
  const endYear = Math.max(viewYear, now.year + 10);
  const yearOptions = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);

  const cellPosition = (type: CellType) => {
    let month = viewMonth;
    let year = viewYear;
    if (type === 'prev') {
      month -= 1;
      if (month < 0) {
        month = 11;
        year -= 1;
      }
    }
    if (type === 'next') {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    return { month, year };
  };

  const pickDay = (day: number, type: CellType) => {
    const { month, year } = cellPosition(type);
    const dateValue = toDateValue(year, month, day);
    if (isPastDate(dateValue)) return;
    setSelected(dateValue);
    if (type !== 'curr') {
      setViewMonth(month);
      setViewYear(year);
    }
  };

  const pickToday = () => {
    if (!todayAvailable) return;
    setSelected(now.dateValue);
    setViewMonth(now.month);
    setViewYear(now.year);
    setMode('days');
  };

  const hour24 = Math.floor(shownMinutes / 60);
  const minute = shownMinutes % 60;
  const period: Period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const periodOffset = (p: Period) => (p === 'PM' ? 12 : 0);

  const setHour = (h12: number) => setMinutes(((h12 % 12) + periodOffset(period)) * 60 + minute);
  const setMinute = (m: number) => setMinutes(hour24 * 60 + m);
  const setPeriod = (p: Period) => setMinutes(((hour24 % 12) + periodOffset(p)) * 60 + minute);

  const hourDisabled = (h12: number) => ((h12 % 12) + periodOffset(period)) * 60 + 55 < minMinutes;
  const minuteDisabled = (m: number) => hour24 * 60 + m < minMinutes;
  const periodDisabled = (p: Period) => ((p === 'AM' ? 11 : 23) * 60 + 55) < minMinutes;

  const canSet = selected !== '' && !isPastDate(selected);

  const apply = () => {
    if (!canSet) return;
    onChange(`${selected}T${toTimeValue(shownMinutes)}`);
    onClose();
  };

  return createPortal(
    <>
      <div className={styles.backdrop} onClick={onClose} role="presentation" aria-hidden="true" />
      <div
        className={styles.popup}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <button
            ref={firstControlRef}
            type="button"
            className={styles.nav}
            onClick={prevMonth}
            disabled={!canGoBack}
            aria-label="Previous month"
          >
            ‹
          </button>
          <div className={styles.titleRow}>
            <button
              type="button"
              className={styles.titleButton}
              onClick={() => setMode(mode === 'months' ? 'days' : 'months')}
              aria-label="Choose month"
            >
              {MONTHS[viewMonth]}
            </button>
            <button
              type="button"
              className={styles.titleButton}
              onClick={() => setMode(mode === 'years' ? 'days' : 'years')}
              aria-label="Choose year"
            >
              {viewYear}
            </button>
          </div>
          <button type="button" className={styles.nav} onClick={nextMonth} aria-label="Next month">
            ›
          </button>
        </div>

        <h2 id={titleId} className={styles.srOnly}>
          {label ? `Choose ${label} date and time` : 'Choose date and time'}
        </h2>
        <div className={styles.divider} aria-hidden="true" />

        {mode === 'months' && (
          <div className={styles.optionList} role="group" aria-label="Choose month">
            {MONTHS.map((month, index) => {
              const disabled = viewYear * 12 + index < currentMonthIndex;
              return (
                <button
                  key={month}
                  type="button"
                  className={cx(styles.option, index === viewMonth && styles.optionActive)}
                  aria-pressed={index === viewMonth}
                  disabled={disabled}
                  onClick={() => {
                    setViewMonth(index);
                    setMode('days');
                  }}
                >
                  {month.slice(0, 3)}
                </button>
              );
            })}
          </div>
        )}

        {mode === 'years' && (
          <div className={styles.optionList} role="group" aria-label="Choose year">
            {yearOptions.map((year) => (
              <button
                key={year}
                ref={year === viewYear ? activeYearRef : undefined}
                type="button"
                className={cx(styles.option, year === viewYear && styles.optionActive)}
                aria-pressed={year === viewYear}
                disabled={year < now.year}
                onClick={() => {
                  setViewYear(year);
                  if (year === now.year && viewMonth < now.month) setViewMonth(now.month);
                  setMode('days');
                }}
              >
                {year}
              </button>
            ))}
          </div>
        )}

        {mode === 'days' && (
          <div className={styles.grid} role="grid" aria-label="Date calendar">
            {DAYS.map((day) => (
              <div key={day} className={styles.dayLabel} role="columnheader">
                {day}
              </div>
            ))}
            {cells.map((cell, index) => {
              const { month, year } = cellPosition(cell.type);
              const cellValue = toDateValue(year, month, cell.day);
              const isToday = cellValue === now.dateValue;
              const isSelected = cellValue === selected;
              const isSaved = cellValue === validValue;
              const disabled = isPastDate(cellValue);
              return (
                <button
                  key={`${cell.type}-${cell.day}-${index}`}
                  type="button"
                  className={cx(
                    styles.cell,
                    cell.type !== 'curr' && styles.cellOther,
                    isToday && styles.cellToday,
                    isSelected && styles.cellSelected,
                    disabled && styles.cellDisabled,
                    disabled && isSaved && styles.cellSaved,
                    cell.type === 'curr' && !isToday && !isSelected && !disabled && styles.cellRaised,
                  )}
                  aria-label={`${formatForScreenReader(cellValue)}${isToday ? ', today' : ''}${isSelected ? ', selected' : ''}${disabled ? ', unavailable' : ''}`}
                  aria-pressed={isSelected}
                  disabled={disabled}
                  onClick={() => pickDay(cell.day, cell.type)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        )}

        <div className={styles.divider} aria-hidden="true" />

        <div className={styles.timeRow} role="group" aria-labelledby={timeLabelId}>
          <span id={timeLabelId} className={styles.timeLabel}>
            Time
          </span>
          <div className={styles.timeControls}>
            <select
              className={styles.timeSelect}
              aria-label="Hour"
              value={hour12}
              onChange={(e) => setHour(Number(e.target.value))}
            >
              {HOURS_12.map((h) => (
                <option key={h} value={h} disabled={hourDisabled(h)}>
                  {pad(h)}
                </option>
              ))}
            </select>
            <span className={styles.timeColon} aria-hidden="true">
              :
            </span>
            <select
              className={styles.timeSelect}
              aria-label="Minute"
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
            >
              {MINUTES.map((m) => (
                <option key={m} value={m} disabled={minuteDisabled(m)}>
                  {pad(m)}
                </option>
              ))}
            </select>
            <div className={styles.periodGroup} role="group" aria-label="AM or PM">
              {(['AM', 'PM'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={cx(styles.periodButton, period === p && styles.periodActive)}
                  aria-pressed={period === p}
                  disabled={periodDisabled(p)}
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.back} onClick={onClose}>
            Back
          </button>
          <button type="button" className={styles.today} onClick={pickToday} disabled={!todayAvailable}>
            Today
          </button>
          <button type="button" className={cx(styles.today, styles.set)} onClick={apply} disabled={!canSet}>
            Set
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}