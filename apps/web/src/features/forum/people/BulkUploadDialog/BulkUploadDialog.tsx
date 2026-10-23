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
import { useForum } from '@/features/forum/lib/store';
import { createPerson, groupFromOption, parsePeopleCsv, type ParsedPeople } from '@/features/forum/lib/people';
import { BULK_ACTION_OPTIONS, GROUP_OPTIONS, ROLE_OPTIONS } from '@/features/forum/lib/options';
import type { BulkAction, ForumPerson, PersonRole } from '@/features/forum/lib/types';
import styles from './BulkUploadDialog.module.css';

export interface BulkResult {
  added: number;
  updated: number;
  removed: number;
  skipped: number;
}

interface BulkUploadDialogProps {
  onClose: () => void;
  onComplete: (result: BulkResult) => void;
}

const MAX_BYTES = 1024 * 1024;
const MAX_ERRORS_SHOWN = 5;
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([type="hidden"]):not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export default function BulkUploadDialog({ onClose, onComplete }: BulkUploadDialogProps) {
  const { weekId, peopleFor, settingsFor, addPeople, updatePerson, removePerson } = useForum();
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
    if (e.key === 'Escape' && !e.defaultPrevented) {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (n) => n.offsetParent !== null,
    );
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

  const upload = () => {
    if (!parsed?.rows.length) return;
    if (action === 'remove' && !window.confirm(`Remove up to ${parsed.rows.length} people from this week?`)) return;

    const settings = settingsFor(weekId);
    const existing = new Map(peopleFor(weekId).map((p) => [p.email, p]));
    const result: BulkResult = { added: 0, updated: 0, removed: 0, skipped: 0 };
    const additions: ForumPerson[] = [];

    for (const row of parsed.rows) {
      const match = existing.get(row.email);
      if (action === 'remove') {
        if (match) {
          removePerson(weekId, match.id);
          result.removed += 1;
        } else result.skipped += 1;
        continue;
      }
      const nextRole = row.role ?? role;
      const nextGroup = row.group === undefined ? groupFromOption(group) : row.group;
      if (match) {
        if (action === 'add' && skipExisting) {
          result.skipped += 1;
          continue;
        }
        updatePerson(weekId, match.id, { role: nextRole, group: nextGroup });
        result.updated += 1;
        continue;
      }
      if (action === 'update') {
        result.skipped += 1;
        continue;
      }
      additions.push(
        createPerson(
          { firstName: row.firstName, lastName: row.lastName, email: row.email, role: nextRole, group: nextGroup },
          settings,
        ),
      );
      result.added += 1;
    }

    if (additions.length) addPeople(weekId, additions);
    onComplete(result);
  };

  const hiddenErrors = (parsed?.errors.length ?? 0) - MAX_ERRORS_SHOWN;

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        onKeyDown={onKeyDown}
      >
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
          <Checkbox
            label="Skip people already enrolled"
            checked={skipExisting}
            onChange={setSkipExisting}
            disabled={action !== 'add'}
          />
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btn} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.submit}`}
            disabled={!parsed?.rows.length}
            onClick={upload}
          >
            Upload
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}