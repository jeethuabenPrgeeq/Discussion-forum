'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { ReadOnlyField } from '@/components/form/FormFields';
import MessageDialog from '@/components/ui/MessageDialog/MessageDialog';
import {
  REPORT_DECISIONS,
  getDecision,
  type ReportDecision,
  type ReportedPost,
} from '@/features/forum/lib/reports';
import styles from './ReportCase.module.css';

const RESOLVED_MESSAGE: Record<ReportDecision, string> = {
  dismiss: 'The reporter is told the report was reviewed. Status becomes Resolved.',
  hide: 'The author is notified. Status becomes Resolved.',
  'remove-warn': 'The warning is saved on the author record. Status becomes Resolved.',
  'remove-deduct': 'The deduction is saved in the audit history. Status becomes Resolved.',
};

interface ReportCaseProps {
  report: ReportedPost;
  justResolved: boolean;
  onBack: () => void;
  onResolve: (decision: ReportDecision, note: string) => void;
}

export function ReportCase({ report, justResolved, onBack, onResolve }: ReportCaseProps) {
  const backRef = useRef<HTMLButtonElement>(null);
  const resolution = report.status === 'resolved' ? report.resolution : undefined;
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    backRef.current?.focus();
  }, [report.id, report.status]);

  useEffect(() => {
    if (justResolved && resolution) setPopupOpen(true);
  }, [justResolved, resolution]);

  const closePopup = () => {
    setPopupOpen(false);
    backRef.current?.focus();
  };

  const evidence = (
    <div className={styles.column}>
      <section className={styles.card} aria-labelledby={`${report.id}-post`}>
        <h2 id={`${report.id}-post`} className={styles.cardTitle}>
          Reported Post
        </h2>
        <blockquote className={styles.post}>
          <p className={styles.postMeta}>
            {report.author} | {report.weekLabel} | {report.topic} | {report.postedAt}
          </p>
          <p className={styles.postBody}>{report.content}</p>
        </blockquote>
      </section>

      <section className={styles.card} aria-labelledby={`${report.id}-details`}>
        <h2 id={`${report.id}-details`} className={styles.cardTitle}>
          Reported Details
        </h2>
        <div className={styles.detailsGrid}>
          <ReadOnlyField label="Flagged by" value={report.reporter} />
          <ReadOnlyField label="Reason" value={report.reason} />
          <ReadOnlyField label="Flagged on" value={report.flaggedOn} />
          <ReadOnlyField label="Report ID" value={report.id} />
        </div>
      </section>

      {resolution && (
        <section className={styles.card} aria-labelledby={`${report.id}-audit`}>
          <h2 id={`${report.id}-audit`} className={styles.cardTitle}>
            Audit History
          </h2>
          <ol className={styles.audit}>
            {report.audit.map((entry, i) => (
              <li key={`${entry.at}-${i}`} className={styles.auditItem}>
                <span className={styles.auditTime}>{entry.at}</span>
                <span className={styles.auditText}>{entry.text}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );

  return (
    <div className={styles.view}>
      <button ref={backRef} type="button" className={styles.back} onClick={onBack}>
        <ArrowLeft size={20} strokeWidth={1.5} aria-hidden />
        Participant
      </button>

      {resolution ? (
        <div className={styles.layout}>
          {evidence}
          <section className={`${styles.card} ${styles.outcome}`} aria-labelledby={`${report.id}-done`}>
            <h2 id={`${report.id}-done`} className={styles.sideTitle}>
              What was done
            </h2>
            <div className={styles.fields}>
              <ReadOnlyField label="Decision" value={getDecision(resolution.decision).summary} />
              <ReadOnlyField label="What it did" value={getDecision(resolution.decision).effect} />
              <ReadOnlyField label="Notified" value={resolution.notified} />
              <ReadOnlyField label="Resolution note" value={resolution.note || '--'} />
              <div className={styles.noteGroup}>
                <span className={styles.fieldLabel}>Resolution note ( kept in audit history )</span>
                <p className={styles.noteBox}>{resolution.note || '-'}</p>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <DecisionForm reportId={report.id} evidence={evidence} onCancel={onBack} onResolve={onResolve} />
      )}

      <MessageDialog
        open={popupOpen}
        title="Report resolved"
        message={resolution ? RESOLVED_MESSAGE[resolution.decision] : ''}
        onClose={closePopup}
      />
    </div>
  );
}

interface DecisionFormProps {
  reportId: string;
  evidence: ReactNode;
  onCancel: () => void;
  onResolve: (decision: ReportDecision, note: string) => void;
}

function DecisionForm({ reportId, evidence, onCancel, onResolve }: DecisionFormProps) {
  const [decision, setDecision] = useState<ReportDecision | null>(null);
  const [note, setNote] = useState('');
  const [emailInvites, setEmailInvites] = useState(true);
  const [skipEnrolled, setSkipEnrolled] = useState(false);
  const noteId = useId();
  const titleId = `${reportId}-choose`;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (decision) onResolve(decision, note);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.layout}>
        {evidence}
        <section className={`${styles.card} ${styles.decide}`} aria-labelledby={titleId}>
          <h2 id={titleId} className={styles.sideTitle}>
            Choose What to do?
          </h2>

          <div className={styles.choices} role="radiogroup" aria-labelledby={titleId}>
            {REPORT_DECISIONS.map((option) => {
              const checked = decision === option.value;
              return (
                <label key={option.value} className={styles.choice} data-checked={checked || undefined}>
                  <input
                    type="radio"
                    name={`${reportId}-decision`}
                    value={option.value}
                    checked={checked}
                    onChange={() => setDecision(option.value)}
                    className={styles.srOnly}
                  />
                  <span className={styles.radio} aria-hidden>
                    {checked && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className={styles.choiceText}>
                    <span className={styles.choiceLabel}>{option.label}</span>
                    <span className={styles.choiceHint}>{option.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className={styles.noteGroup}>
            <label htmlFor={noteId} className={styles.fieldLabel}>
              Resolution note ( kept in audit history )
            </label>
            <textarea
              id={noteId}
              className={styles.textarea}
              placeholder="Why did you decide this..."
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className={styles.checks}>
            <CheckOption label="Email invites to new people" checked={emailInvites} onChange={setEmailInvites} />
            <CheckOption label="Skip people already enrolled" checked={skipEnrolled} onChange={setSkipEnrolled} />
          </div>
        </section>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={`${styles.btn} ${styles.primary}`} disabled={!decision}>
          Submit and Resolve
        </button>
      </div>
    </form>
  );
}

interface CheckOptionProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CheckOption({ label, checked, onChange }: CheckOptionProps) {
  return (
    <label className={styles.check} data-checked={checked || undefined}>
      <input
        type="checkbox"
        className={styles.srOnly}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.box} aria-hidden>
        {checked && <Check size={13} strokeWidth={3} />}
      </span>
      {label}
    </label>
  );
}