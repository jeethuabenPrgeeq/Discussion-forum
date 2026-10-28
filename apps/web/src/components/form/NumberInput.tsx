"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import styles from "./NumberInput.module.css";

interface NumberInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  pad?: number;
  id?: string;
  name?: string;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

const decimalsOf = (n: number) => (String(n).split(".")[1] ?? "").length;

export default function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  pad,
  id,
  name,
  placeholder,
  ariaLabel,
  disabled,
  className,
}: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const valueRef = useRef(value);
  const timerRef = useRef<number | null>(null);
  const decimals = decimalsOf(step);
  const allowNegative = min === undefined || min < 0;
  const pattern = new RegExp(`^${allowNegative ? "-?" : ""}\\d*${decimals ? "(\\.\\d*)?" : ""}$`);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const clamp = (n: number) => {
    let r = n;
    if (min !== undefined) r = Math.max(min, r);
    if (max !== undefined) r = Math.min(max, r);
    return Number(r.toFixed(decimals));
  };

  const inRange = (n: number) => (min === undefined || n >= min) && (max === undefined || n <= max);

  const format = (n: number | null) => {
    if (n === null) return "";
    const abs = Math.abs(n).toFixed(decimals);
    const padded = pad ? abs.padStart(pad, "0") : abs;
    return n < 0 ? `-${padded}` : padded;
  };

  const stepBy = (dir: 1 | -1) => {
    const current = valueRef.current;
    const next = current === null ? clamp(min ?? 0) : clamp(current + dir * step);
    valueRef.current = next;
    setDraft(null);
    onChange(next);
  };

  const commit = () => {
    if (draft === null) return;
    if (draft === "" || draft === "-" || draft === ".") {
      onChange(null);
    } else {
      const n = Number(draft);
      onChange(Number.isFinite(n) ? clamp(n) : valueRef.current);
    }
    setDraft(null);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!pattern.test(raw)) return;
    setDraft(raw);
    if (raw === "") {
      onChange(null);
      return;
    }
    const n = Number(raw);
    if (Number.isFinite(n) && inRange(n)) onChange(n);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      stepBy(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      stepBy(-1);
    } else if (e.key === "Home" && min !== undefined) {
      e.preventDefault();
      setDraft(null);
      onChange(min);
    } else if (e.key === "End" && max !== undefined) {
      e.preventDefault();
      setDraft(null);
      onChange(max);
    } else if (e.key === "Enter") {
      commit();
    }
  };

  const stopRepeat = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRepeat = (dir: 1 | -1) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    stopRepeat();
    stepBy(dir);
    const tick = () => {
      stepBy(dir);
      timerRef.current = window.setTimeout(tick, 70);
    };
    timerRef.current = window.setTimeout(tick, 400);
    window.addEventListener("pointerup", stopRepeat, { once: true });
    window.addEventListener("pointercancel", stopRepeat, { once: true });
  };

  const atMin = value !== null && min !== undefined && value <= min;
  const atMax = value !== null && max !== undefined && value >= max;

  return (
    <div className={`${styles.field} ${disabled ? styles.disabled : ""} ${className ?? ""}`}>
      <input
        id={id}
        name={name}
        type="text"
        role="spinbutton"
        inputMode={decimals ? "decimal" : "numeric"}
        autoComplete="off"
        className={styles.input}
        value={draft ?? format(value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-valuenow={value ?? undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        disabled={disabled}
        onChange={handleChange}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
      <div className={styles.arrows}>
        <button
          type="button"
          tabIndex={-1}
          className={styles.arrow}
          aria-label="Increase"
          disabled={disabled || atMax}
          onPointerDown={startRepeat(1)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4.5 10 8 6.5 11.5 10" />
          </svg>
        </button>
        <button
          type="button"
          tabIndex={-1}
          className={styles.arrow}
          aria-label="Decrease"
          disabled={disabled || atMin}
          onPointerDown={startRepeat(-1)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4.5 6 8 9.5 11.5 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}