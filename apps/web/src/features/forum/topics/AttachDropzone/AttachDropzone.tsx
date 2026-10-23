'use client';

import { useId, useRef, useState, type DragEvent } from 'react';
import { X } from 'lucide-react';
import { AttachmentIcon } from '@/components/icons';
import styles from './AttachDropzone.module.css';

const EXTENSIONS = ['pdf', 'docx', 'png'];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 3;

interface AttachDropzoneProps {
  compact?: boolean;
  onChange?: (files: File[]) => void;
}

export default function AttachDropzone({ compact, onChange }: AttachDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const full = files.length >= MAX_FILES;

  const commit = (next: File[]) => {
    setFiles(next);
    onChange?.(next);
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming?.length) return;
    const accepted: File[] = [];
    const problems: string[] = [];

    for (const file of Array.from(incoming)) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!EXTENSIONS.includes(ext)) problems.push(`${file.name}: unsupported type`);
      else if (file.size > MAX_BYTES) problems.push(`${file.name}: over 5 MB`);
      else if (!files.some((f) => f.name === file.name && f.size === file.size)) accepted.push(file);
    }

    const room = MAX_FILES - files.length;
    if (accepted.length > room) problems.push(`Only ${MAX_FILES} files allowed`);
    commit([...files, ...accepted.slice(0, Math.max(0, room))]);
    setError(problems.length ? problems.join(' · ') : null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (!full) addFiles(e.dataTransfer.files);
  };

  return (
    <div className={styles.wrap}>
            <div
        className={styles.zone}
        data-compact={compact || undefined}
        data-dragging={dragging || undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept=".pdf,.docx,.png"
          className={styles.input}
          disabled={full}
          onChange={(e) => addFiles(e.target.files)}
        />
        <label
          htmlFor={inputId}
          className={styles.button}
          data-disabled={full || undefined}
          title={compact ? `PDF, DOCX, PNG · 5 MB · ${MAX_FILES} files` : undefined}
        >
          <AttachmentIcon />
          Attach
        </label>
        {!compact && <span className={styles.hint}>PDF, DOCX, PNG · 5 MB · {MAX_FILES} files</span>}
      </div>

      {files.length > 0 && (
        <ul className={styles.files}>
          {files.map((f) => (
            <li key={`${f.name}-${f.size}`} className={styles.file}>
              <span className={styles.fileName}>{f.name}</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => commit(files.filter((x) => x !== f))}>
                <X size={14} />
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