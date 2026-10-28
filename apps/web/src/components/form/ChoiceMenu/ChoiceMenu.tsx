"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./ChoiceMenu.module.css";

export interface ChoiceMenuItem {
  key: string;
  label: string;
  checked?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

interface ChoiceMenuProps {
  title: string;
  items: ChoiceMenuItem[];
  label?: string;
}

function CheckedMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.33 8.17L7 9.83L10.67 6.17" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ChoiceMenu({ title, items, label = "Choose" }: ChoiceMenuProps) {
  const id = useId();
  const menuId = `${id}-menu`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const openMenu = () => {
    setActive(0);
    setOpen(true);
  };

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const choose = (index: number) => {
    const item = items[index];
    if (!item || item.disabled) return;
    close();
    item.onSelect();
  };

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMenu();
    }
  };

  const onMenuKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const last = items.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => (i >= last ? 0 : i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => (i <= 0 ? last : i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={styles.menuWrap} data-open={open || undefined}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.choose}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Actions for ${title}`}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        {label}
        <ChevronDown size={20} strokeWidth={1.5} className={styles.chevron} aria-hidden />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={menuId}
          role="menu"
          tabIndex={-1}
          className={styles.menu}
          aria-label={`Actions for ${title}`}
          aria-activedescendant={`${menuId}-${active}`}
          onKeyDown={onMenuKeyDown}
        >
          {items.map((item, i) => {
            const isToggle = item.checked !== undefined;
            return (
              <li
                key={item.key}
                id={`${menuId}-${i}`}
                role={isToggle ? "menuitemcheckbox" : "menuitem"}
                aria-checked={isToggle ? item.checked : undefined}
                aria-disabled={item.disabled || undefined}
                className={styles.menuItem}
                data-active={i === active || undefined}
                data-disabled={item.disabled || undefined}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
              >
                <span className={styles.radio} data-checked={item.checked || undefined} aria-hidden="true">
                  {item.checked ? <CheckedMark /> : <span className={styles.ring} />}
                </span>
                <span className={styles.menuLabel}>{item.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}