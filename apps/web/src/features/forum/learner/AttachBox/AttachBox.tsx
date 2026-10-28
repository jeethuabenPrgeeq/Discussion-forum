"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Paperclip, X } from "lucide-react";
import { ATTACH_RULES } from "@/features/forum/lib/learner";
import styles from "./AttachBox.module.css";

const MB = 1024 * 1024;
const TYPES_LABEL = ATTACH_RULES.types.map((t) => t.toUpperCase()).join(",");
const ACCEPT = ATTACH_RULES.types.map((t) => `.${t}`).join(",");

export default function AttachBox({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const addFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    const errors: string[] = [];
    const accepted = picked.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ATTACH_RULES.types.includes(ext)) {
        errors.push(`${file.name}: only ${TYPES_LABEL} allowed`);
        return false;
      }
      if (file.size > ATTACH_RULES.maxSizeMb * MB) {
        errors.push(`${file.name}: larger than ${ATTACH_RULES.maxSizeMb} MB`);
        return false;
      }
      return true;
    });
    const room = Math.max(0, ATTACH_RULES.maxFiles - files.length);
    if (accepted.length > room) errors.push(`You can attach up to ${ATTACH_RULES.maxFiles} files`);
    onChange([...files, ...accepted.slice(0, room)]);
    setError(errors[0] ?? "");
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
    setError("");
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.attach}>
        <button
          type="button"
          className={styles.attachBtn}
          onClick={() => inputRef.current?.click()}
          disabled={files.length >= ATTACH_RULES.maxFiles}
        >
          <Paperclip size={18} strokeWidth={1.5} aria-hidden />
          Attach
        </button>
        <span className={styles.rule}>
          {TYPES_LABEL}- {ATTACH_RULES.maxSizeMb} MB- {ATTACH_RULES.maxFiles} files
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className={styles.srOnly}
          onChange={addFiles}
          tabIndex={-1}
          aria-hidden
        />
      </div>
      {files.length > 0 && (
        <ul className={styles.fileList}>
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className={styles.fileChip}>
              <span className={styles.fileName}>{file.name}</span>
              <button
                type="button"
                className={styles.fileRemove}
                aria-label={`Remove ${file.name}`}
                onClick={() => removeFile(index)}
              >
                <X size={14} strokeWidth={2} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}