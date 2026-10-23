'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowDownIcon } from '@/components/icons';
import styles from './Select.module.css';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  ariaLabel?: string;
}

interface SelectProps<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  variant?: 'filter' | 'field';
  id?: string;
  label?: string;
  labelledBy?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

function CheckedMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.33 8.17L7 9.83L10.67 6.17"
        fill="none"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Select<T extends string>({
  value,
  options,
  onChange,
  variant = 'filter',
  id,
  label,
  labelledBy,
  disabled,
  className,
}: SelectProps<T>) {
  const autoId = useId();
  const triggerId = id ?? `${autoId}-trigger`;
  const listId = `${autoId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typeaheadRef = useRef({ text: '', at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];

  const openList = () => {
    if (disabled) return;
    setActive(selectedIndex);
    setOpen(true);
  };

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const choose = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    close();
  };

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const typeahead = (key: string) => {
    const now = Date.now();
    const state = typeaheadRef.current;
    state.text = now - state.at > 600 ? key : state.text + key;
    state.at = now;
    const start = state.text.length === 1 ? active + 1 : active;
    for (let i = 0; i < options.length; i++) {
      const index = (start + i) % options.length;
      if (options[index].label.toLowerCase().startsWith(state.text.toLowerCase())) {
        setActive(index);
        return;
      }
    }
  };

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  };

  const onListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => Math.min(i + 1, last));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(last);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(active);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) typeahead(e.key);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${className ?? ''}`}
      data-variant={variant}
      data-open={open || undefined}
    >
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className={styles.trigger}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={labelledBy ? undefined : `${label ?? ''}: ${selected?.label ?? ''}`}
        aria-labelledby={labelledBy ? `${labelledBy} ${triggerId}` : undefined}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={styles.triggerLabel}>{selected?.label}</span>
        <ArrowDownIcon className={styles.chevron} />
      </button>

      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          className={styles.panel}
          aria-labelledby={labelledBy}
          aria-label={labelledBy ? undefined : label}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKeyDown}
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <div
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={isSelected}
                data-index={i}
                data-active={i === active || undefined}
                className={styles.option}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
              >
                <span className={styles.radio} aria-hidden="true">
                  {isSelected ? <CheckedMark /> : <span className={styles.ring} />}
                </span>
                <span className={styles.optionLabel}>{o.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}