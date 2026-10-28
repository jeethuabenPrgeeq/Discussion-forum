"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import styles from "./ExportDialog.module.css";

export type ExportFormat = "pdf" | "csv" | "xlsx";
export type ExportSection = string;

export interface ExportSectionOption {
  value: ExportSection;
  label: string;
}

export interface ExportOptions {
  format: ExportFormat;
  include: ExportSection[];
}

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "Excel (XLSX)" },
];

export const ADMIN_EXPORT_SECTIONS: ExportSectionOption[] = [
  { value: "topics", label: "Topics and posts" },
  { value: "grades", label: "Grades" },
  { value: "participation", label: "Participation" },
  { value: "reported", label: "Reported posts" },
  { value: "attachments", label: "Attachments (zip)" },
];

interface ExportDialogProps {
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  sections?: ExportSectionOption[];
}

export function ExportDialog({ onClose, onExport, sections = ADMIN_EXPORT_SECTIONS }: ExportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const formatId = useId();
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [include, setInclude] = useState<ExportSection[]>(() => (sections.length ? [sections[0].value] : []));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const toggle = (value: ExportSection) =>
    setInclude((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (include.length === 0) return;
    onExport({
      format,
      include: sections.map((s) => s.value).filter((v) => include.includes(v)),
    });
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.body}>
          <h2 id={titleId} className={styles.title}>
            Export
          </h2>

          <div className={styles.fields}>
            <div className={styles.group}>
              <label htmlFor={formatId} className={styles.label}>
                Format
              </label>
              <div className={styles.selectWrap}>
                <select
                  id={formatId}
                  className={styles.select}
                  value={format}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                >
                  {FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <svg className={styles.chevron} viewBox="0 0 28 28" aria-hidden="true">
                  <path d="M7 10.5 14 17.5 21 10.5" />
                </svg>
              </div>
            </div>

            <fieldset className={styles.includeGroup}>
              <legend className={styles.label}>Include</legend>
              <div className={styles.list}>
                {sections.map((s) => (
                  <label key={s.value} className={styles.row}>
                    <input
                      type="checkbox"
                      className={styles.input}
                      checked={include.includes(s.value)}
                      onChange={() => toggle(s.value)}
                    />
                    <span className={styles.box} aria-hidden="true">
                      <svg className={styles.tick} viewBox="0 0 16 16">
                        <rect width="16" height="16" rx="3" />
                        <path d="M5 8.2 7 10.2 11 6" />
                      </svg>
                    </span>
                    <span className={styles.text}>{s.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={`${styles.btn} ${styles.cancel}`} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={`${styles.btn} ${styles.primary}`} disabled={include.length === 0}>
            Export
          </button>
        </div>
      </form>
    </dialog>
  );
}