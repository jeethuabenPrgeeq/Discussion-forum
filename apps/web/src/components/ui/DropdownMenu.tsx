'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './DropdownMenu.module.css';

export interface MenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  tone?: 'danger';
}

interface DropdownMenuProps {
  label: string;
  items: MenuItem[];
  align?: 'start' | 'end';
  trigger?: ReactNode;
  triggerClassName?: string;
}

export default function DropdownMenu({ label, items, align = 'end', trigger, triggerClassName }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    root?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const onPointer = (e: PointerEvent) => {
      if (!root?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const i = nodes.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'ArrowDown' ? (i + 1) % nodes.length : (i - 1 + nodes.length) % nodes.length;
    nodes[next]?.focus();
  };

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName ?? styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={trigger ? label : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger ?? (
          <>
            {label}
            <ChevronDown size={18} strokeWidth={1.5} aria-hidden />
          </>
        )}
      </button>

      {open && (
        <div id={menuId} role="menu" aria-label={label} className={styles.menu} data-align={align} onKeyDown={onMenuKeyDown}>
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={styles.item}
              data-tone={item.tone}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}