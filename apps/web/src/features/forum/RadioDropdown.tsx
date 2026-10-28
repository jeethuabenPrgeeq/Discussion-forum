"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./RadioDropdown.module.css";

export interface RadioOption<T extends string> {
  value: T;
  label: string;
}

interface RadioDropdownProps<T extends string> {
  value: T;
  options: RadioOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  ariaLabel?: string;
  variant?: "compact" | "field";
  className?: string;
}

export default function RadioDropdown<T extends string>({
  value,
  options,
  onChange,
  label,
  ariaLabel,
  variant = "compact",
  className,
}: RadioDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const listId = `${id}-list`;
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  const openList = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const choose = (index: number) => {
    onChange(options[index].value);
    close();
  };

  const handleTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openList();
    }
  };

  const handleListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(options.length - 1, a + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
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

  const rootClass = [styles.root, styles[variant], open ? styles.open : "", className ?? ""].join(" ");

  return (
    <div ref={wrapRef} className={rootClass}>
      {label && (
        <span id={labelId} className={styles.label}>
          {label}
        </span>
      )}
      <div className={styles.anchor}>
        <button
          ref={triggerRef}
          type="button"
          className={styles.trigger}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={label ? undefined : ariaLabel}
          aria-labelledby={label ? `${labelId} ${valueId}` : undefined}
          onClick={() => (open ? close(false) : openList())}
          onKeyDown={handleTriggerKey}
        >
          <span id={valueId} className={styles.value}>
            {selected?.label}
          </span>
          <ChevronDown size={20} strokeWidth={1.5} className={styles.chevron} aria-hidden />
        </button>

        {open && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            className={styles.panel}
            aria-label={label ?? ariaLabel}
            aria-activedescendant={`${id}-opt-${active}`}
            onKeyDown={handleListKey}
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  className={`${styles.option} ${i === active ? styles.active : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                >
                  <span className={`${styles.radio} ${isSelected ? styles.radioOn : ""}`} aria-hidden>
                    {isSelected ? (
                      <svg viewBox="0 0 16 16" className={styles.check}>
                        <circle cx="8" cy="8" r="6.5" />
                        <path d="M5.6 8.2 7.2 9.8 10.4 6.4" />
                      </svg>
                    ) : (
                      <span className={styles.ring} />
                    )}
                  </span>
                  {o.label}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}