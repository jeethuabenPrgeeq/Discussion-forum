"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, downloadExport } from "@/features/forum/lib/api";
import { useForum } from "@/features/forum/lib/store";
import styles from "./ExportDialog.module.css";

export type ExportFormat = "pdf" | "csv" | "xlsx";
export type ExportSection = string;
export type ExportRange = "all" | "7d" | "30d";

export interface ExportSectionOption {
  value: ExportSection;
  label: string;
}

export interface ExportOptions {
  format: ExportFormat;
  include: ExportSection[];
  group?: string;
  range?: ExportRange;
}

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "xlsx", label: "Excel" },
  { value: "csv", label: "CSV" },
  { value: "pdf", label: "PDF" },
];

const RANGES: { value: ExportRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

export const ADMIN_EXPORT_SECTIONS: ExportSectionOption[] = [
  { value: "topics", label: "Topics and posts" },
  { value: "grades", label: "Grades" },
  { value: "participation", label: "Participation" },
  { value: "reported", label: "Reported posts" },
  { value: "attachments", label: "Attachments (zip)" },
];

const API_SECTION: Record<string, string> = {
  topics: "topics",
  posts: "topics",
  discussion: "topics",
  grades: "grades",
  grade: "grades",
  participation: "people",
  people: "people",
  progress: "people",
  reported: "reports",
  reports: "reports",
};

const toApiSections = (include: ExportSection[]) => {
  const mapped = [...new Set(include.map((s) => API_SECTION[s]).filter((s): s is string => Boolean(s)))];
  return mapped.length ? mapped : ["topics"];
};

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

interface ExportDialogProps {
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  sections?: ExportSectionOption[];
  groups?: string[];
}

interface SelectBoxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}

function SelectBox({ label, value, onChange, children }: SelectBoxProps) {
  const id = useId();
  return (
    <div className={styles.group}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.selectWrap}>
        <select id={id} className={styles.select} value={value} onChange={(e) => onChange(e.target.value)}>
          {children}
        </select>
        <svg className={styles.chevron} viewBox="0 0 28 28" aria-hidden="true">
          <path d="M7 10.5 14 17.5 21 10.5" />
        </svg>
      </div>
    </div>
  );
}

export function ExportDialog({ onClose, onExport, sections = ADMIN_EXPORT_SECTIONS, groups }: ExportDialogProps) {
  const { weekId, forumIdFor, forumDetailFor } = useForum();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [include, setInclude] = useState<ExportSection[]>(() => (sections.length ? [sections[0].value] : []));
  const [group, setGroup] = useState("all");
  const [range, setRange] = useState<ExportRange>("all");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showScope = groups !== undefined;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const toggle = (value: ExportSection) =>
    setInclude((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const close = () => {
    if (!exporting) onClose();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (include.length === 0 || exporting) return;
    const forumId = forumIdFor(weekId);
    if (!forumId) {
      setError("The forum hasn't loaded yet. Refresh and try again.");
      return;
    }

    const options: ExportOptions = {
      format,
      include: sections.map((s) => s.value).filter((v) => include.includes(v)),
      ...(showScope ? { group, range } : {}),
    };

    setExporting(true);
    setError(null);
    try {
      const forum = forumDetailFor(weekId);
      await downloadExport(forumId, {
        format,
        sections: [...toApiSections(options.include), ...(options.include.includes("attachments") ? ["attachments"] : [])],
        filename: slug(`${weekId}-${forum.title}`) || "forum-export",
        group: options.group,
        range: options.range,
        attachments: options.include.includes("attachments"),
      });
      onExport(options);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Export failed. Check that the API is running and try again.");
      setExporting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(e) => {
        if (exporting) e.preventDefault();
      }}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <form className={styles.card} onSubmit={(e) => void handleSubmit(e)}>
        <div className={styles.body}>
          <h2 id={titleId} className={styles.title}>
            Export
          </h2>

          <div className={styles.fields}>
            <SelectBox label="Format" value={format} onChange={(v) => setFormat(v as ExportFormat)}>
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </SelectBox>

            <fieldset className={styles.includeGroup}>
              <legend className={styles.label}>Include</legend>
              <div className={styles.list}>
                {sections.map((s) => (
                  <label key={s.value} className={styles.row}>
                    <input type="checkbox" className={styles.input} checked={include.includes(s.value)} onChange={() => toggle(s.value)} />
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

            {showScope && (
              <>
                <SelectBox label="Group" value={group} onChange={setGroup}>
                  <option value="all">All groups</option>
                  {groups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </SelectBox>

                <SelectBox label="Date" value={range} onChange={(v) => setRange(v as ExportRange)}>
                  {RANGES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </SelectBox>
              </>
            )}

            {error && (
              <p role="alert" style={{ color: "var(--red)", margin: 0, fontSize: 14 }}>
                {error}
              </p>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={`${styles.btn} ${styles.cancel}`} onClick={close} disabled={exporting}>
            Cancel
          </button>
          <button type="submit" className={`${styles.btn} ${styles.primary}`} disabled={include.length === 0 || exporting}>
            {exporting ? "Exporting…" : "Export"}
          </button>
        </div>
      </form>
    </dialog>
  );
}