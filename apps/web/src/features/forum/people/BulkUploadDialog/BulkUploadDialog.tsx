'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { FileText, X } from 'lucide-react';
import Checkbox from '@/components/form/Checkbox';
import { SelectField } from '@/components/form/FormFields';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import { api, ApiError } from '@/features/forum/lib/api';
import { useForum } from '@/features/forum/lib/store';
import { groupFromOption, parsePeopleCsv, type ParsedPeople } from '@/features/forum/lib/people';
import { BULK_ACTION_OPTIONS, GROUP_OPTIONS, ROLE_OPTIONS } from '@/features/forum/lib/options';
import type { BulkAction, PersonRole } from '@/features/forum/lib/types';
import styles from './BulkUploadDialog.module.css';

export interface BulkResult {
  added: number;
  updated: number;
  removed: number;
  skipped: number;
}

interface ApiBulkResult extends BulkResult {
  errors: string[];
}

interface BulkUploadDialogProps {
  onClose: () => void;
  onComplete: (result: BulkResult) => void;
}

const MAX_BYTES = 1024 * 1024;
const MAX_ERRORS_SHOWN = 5;
const BATCH_SIZE = 500;
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([type="hidden"]):not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export default function BulkUploadDialog({ onClose, onComplete }: BulkUploadDialogProps) {
  const { weekId, peopleFor, forumIdFor, loadPeople } = useForum();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [action, setAction] = useState<BulkAction>('add');
  const [role, setRole] = useState<PersonRole>('learner');
  const [group, setGroup] = useState('none');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedPeople | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [emailInvites, setEmailInvites] = useState(true);
  const [skipExisting, setSkipExisting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && !e.defaultPrevented && !confirmOpen && !uploading) {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const clearFile = () => {
    setFileName(null);
    setParsed(null);
    setFileError(null);
  };

  const readFile = async (file: File) => {
    clearFile();
    if (/\.xlsx?$/i.test(file.name)) {
      setFileError('Excel import is not wired up yet. Save the sheet as CSV and upload that.');
      return;
    }
    if (!/\.csv$/i.test(file.name)) {
      setFileError('Upload a .csv file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError('The file is larger than 1 MB.');
      return;
    }
    setFileName(file.name);
    setParsed(parsePeopleCsv(await file.text()));
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void readFile(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void readFile(file);
  };

  const runUpload = async () => {
    if (!parsed?.rows.length || uploading) return;
    const forumId = forumIdFor(weekId);
    if (!forumId) {
      setFileError("The forum hasn't loaded yet. Refresh and try again.");
      return;
    }

    const enrolled = new Set(peopleFor(weekId).map((p) => p.email.toLowerCase()));
    const rows = parsed.rows.map((row) => {
      const nextRole = row.role ?? role;
      const email = row.email.toLowerCase();
      const rowAction = action === 'add' && !skipExisting && enrolled.has(email) ? 'update' : action;
      return {
        action: rowAction,
        firstName: row.firstName,
        lastName: row.lastName,
        email,
        role: nextRole === 'observer' ? 'observer' : 'learner',
        group: row.group === undefined ? groupFromOption(group) : row.group,
      };
    });

    setUploading(true);
    setFileError(null);
    const total: ApiBulkResult = { added: 0, updated: 0, removed: 0, skipped: 0, errors: [] };

    try {
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const result = await api<ApiBulkResult>(`/forums/${forumId}/people/bulk`, {
          method: 'POST',
          json: { rows: rows.slice(i, i + BATCH_SIZE), sendInvites: emailInvites },
        });
        total.added += result.added;
        total.updated += result.updated;
        total.removed += result.removed;
        total.skipped += result.skipped;
        total.errors.push(...result.errors);
      }
      await loadPeople(weekId, true);
      if (total.errors.length) console.info('[bulk-upload] skipped rows', total.errors);
      onComplete({ added: total.added, updated: total.updated, removed: total.removed, skipped: total.skipped });
    } catch (error) {
      setFileError(error instanceof ApiError ? error.message : 'Upload failed. Check that the API is running and try again.');
      setUploading(false);
    }
  };

  const upload = () => {
    if (action === 'remove') {
      setConfirmOpen(true);
      return;
    }
    void runUpload();
  };

  const hiddenErrors = (parsed?.errors.length ?? 0) - MAX_ERRORS_SHOWN;

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !uploading) onClose();
      }}
    >
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className={styles.dialog} onKeyDown={onKeyDown}>
        <h2 id={titleId} className={styles.title}>
          Bulk upload people
        </h2>

        <div className={styles.fields}>
          <SelectField label="What to do" value={action} options={BULK_ACTION_OPTIONS} onChange={setAction} />
          <SelectField label="Default role" value={role} options={ROLE_OPTIONS} onChange={setRole} />
          <SelectField label="Default Group" value={group} options={GROUP_OPTIONS} onChange={setGroup} />

          <div>
            <div
              className={styles.drop}
              data-active={dragging || undefined}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              {fileName ? (
                <p className={styles.file}>
                  <FileText size={20} strokeWidth={1.5} aria-hidden />
                  {fileName}
                  <button type="button" className={styles.remove} aria-label="Remove file" onClick={clearFile}>
                    <X size={16} strokeWidth={2} />
                  </button>
                </p>
              ) : (
                <p className={styles.hint}>
                  <FileText size={20} strokeWidth={1.5} aria-hidden />
                  Drop CSV or Excel here
                </p>
              )}
              <span className={styles.or}>OR</span>
              <button type="button" className={styles.choose} onClick={() => fileRef.current?.click()}>
                Choose File
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                className={styles.fileInput}
                tabIndex={-1}
                aria-hidden
                onChange={onPick}
              />
            </div>
            <p className={styles.help}>Columns: first_name, last_name, email, role (optional), group (optional)</p>
            <div aria-live="polite">
              {fileError && <p className={styles.error}>{fileError}</p>}
              {parsed && (
                <>
                  <p className={parsed.rows.length ? styles.ready : styles.error}>
                    {parsed.rows.length} {parsed.rows.length === 1 ? 'person' : 'people'} ready
                  </p>
                  {parsed.errors.length > 0 && (
                    <ul className={styles.errors}>
                      {parsed.errors.slice(0, MAX_ERRORS_SHOWN).map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                      {hiddenErrors > 0 && <li>and {hiddenErrors} more</li>}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className={styles.options}>
          <Checkbox label="Email invites to new people" checked={emailInvites} onChange={setEmailInvites} />
          <Checkbox label="Skip people already enrolled" checked={skipExisting} onChange={setSkipExisting} disabled={action !== 'add'} />
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btn} onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.submit}`}
            disabled={!parsed?.rows.length || uploading}
            onClick={upload}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Remove people?"
        message={`Remove up to ${parsed?.rows.length ?? 0} people from this week's forum? This can't be undone.`}
        confirmLabel="Remove"
        onConfirm={() => {
          setConfirmOpen(false);
          void runUpload();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>,
    document.body,
  );
}