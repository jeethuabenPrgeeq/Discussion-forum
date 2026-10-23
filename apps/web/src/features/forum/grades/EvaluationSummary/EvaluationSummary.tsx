'use client';

import { useState } from 'react';
import DOMPurify from 'dompurify';
import { CalendarDays } from 'lucide-react';
import CollapsibleCard from '@/components/ui/CollapsibleCard';
import { ReadOnlyField } from '@/components/form/FormFields';
import InfoBanner from '@/components/ui/InfoBanner';
import RichTextEditor from '@/components/editor/RichTextEditor';
import Select from '@/components/form/Select';
import {
  EVALUATOR_OPTIONS,
  POST_MAX,
  REPLY_MAX,
  RUBRIC,
  TOTAL_MAX,
  VALIDATION_RULES,
  formatDate,
  formatMark,
  formatNumericDate,
  type Scores,
} from '@/features/forum/lib/grading';
import { pad2 } from '@/features/forum/lib/utils';
import type { Evaluation } from '@/features/forum/lib/types';
import styles from './EvaluationSummary.module.css';

type SectionKey = 'marks' | 'feedback' | 'actions' | 'audit' | 'rules';

interface EvaluationSummaryProps {
  evaluation: Evaluation;
  scores: Scores;
  locked: boolean;
  isAdmin: boolean;
  onChange: (patch: Partial<Evaluation>) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onPublish: () => void;
  onReEvaluate: () => void;
}

function Html({ html }: { html: string }) {
  return (
    <div
      className={styles.readonlyHtml}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html || '<p>—</p>') }}
    />
  );
}

export default function EvaluationSummary({
  evaluation,
  scores,
  locked,
  isAdmin,
  onChange,
  onSaveDraft,
  onSubmit,
  onPublish,
  onReEvaluate,
}: EvaluationSummaryProps) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    marks: false,
    feedback: false,
    actions: false,
    audit: false,
    rules: false,
  });
  const toggle = (key: SectionKey) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  const components: [string, number, number][] = [
    ['Original Discussion post', POST_MAX, scores.post],
    ...scores.replies.map((r, i): [string, number, number] => [`Peer Reply ${i + 1}`, REPLY_MAX, r]),
  ];

  return (
    <div className={styles.summary}>
      <CollapsibleCard title="Final Marks summary" open={open.marks} onToggle={() => toggle('marks')}>
        <div className={styles.body}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Assessment Components</th>
                <th scope="col" className={styles.center}>Maximum Marks</th>
                <th scope="col" className={styles.center}>Marks Obtained</th>
              </tr>
            </thead>
            <tbody>
              {components.map(([label, max, got]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td className={styles.center}><span className={styles.box}>{max}</span></td>
                  <td className={styles.center}><span className={styles.box}>{formatMark(got)}/{max}</span></td>
                </tr>
              ))}
              <tr className={styles.total}>
                <th scope="row">Total</th>
                <td className={styles.center}>{TOTAL_MAX}</td>
                <td className={styles.center}>
                  {formatMark(scores.total)}<span className={styles.light}>/{TOTAL_MAX}</span>
                </td>
              </tr>
              <tr>
                <th scope="row">Percentage</th>
                <td className={styles.center}>100%</td>
                <td className={styles.center}>{scores.percentage}%</td>
              </tr>
              <tr>
                <th scope="row">Final Grade ( Configurable Scale )</th>
                <td className={styles.center}>A TO F</td>
                <td className={`${styles.center} ${styles.grade}`}>{scores.grade ?? '—'}</td>
              </tr>
            </tbody>
          </table>
          <InfoBanner>Grade is generated automatically once all marks are valid.</InfoBanner>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Evaluator Feedback" open={open.feedback} onToggle={() => toggle('feedback')}>
        <div className={styles.body}>
          {locked ? (
            <>
              <div className={styles.field}>
                <span className={styles.label}>Overall Feedback</span>
                <Html html={evaluation.overallFeedback} />
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Areas for Improvement</span>
                <Html html={evaluation.improvement} />
              </div>
            </>
          ) : (
            <>
              <RichTextEditor
                label="Overall Feedback"
                variant="inset"
                placeholder="Overall feedback for the learner"
                initialHTML={evaluation.overallFeedback}
                onChange={(html) => onChange({ overallFeedback: DOMPurify.sanitize(html) })}
              />
              <RichTextEditor
                label="Areas for Improvement"
                variant="inset"
                placeholder="What should the learner work on next?"
                initialHTML={evaluation.improvement}
                onChange={(html) => onChange({ improvement: DOMPurify.sanitize(html) })}
              />
            </>
          )}

          <div className={styles.grid3}>
            {locked ? (
              <ReadOnlyField label="Evaluator Name" value={evaluation.evaluator} />
            ) : (
              <div className={styles.field}>
                <span className={styles.label}>Evaluator Name</span>
                <Select
                  variant="field"
                  ariaLabel="Evaluator Name"
                  value={evaluation.evaluator}
                  options={EVALUATOR_OPTIONS}
                  onChange={(v) => onChange({ evaluator: v })}
                />
              </div>
            )}
            {locked ? (
              <ReadOnlyField
                label="Evaluation Date"
                value={evaluation.evaluatedOn ? formatNumericDate(evaluation.evaluatedOn) : '—'}
                trailing={<CalendarDays size={24} strokeWidth={1.5} />}
              />
            ) : (
              <label className={styles.field}>
                <span className={styles.label}>Evaluation Date</span>
                <input
                  type="date"
                  className={styles.input}
                  value={evaluation.evaluatedOn}
                  onChange={(e) => onChange({ evaluatedOn: e.target.value })}
                />
              </label>
            )}
            <ReadOnlyField label="Rubric Version used" value={RUBRIC.version} />
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Actions" open={open.actions} onToggle={() => toggle('actions')}>
        <div className={styles.body}>
          <div className={styles.actions}>
            <button type="button" className={styles.action} onClick={onSaveDraft} disabled={locked}>
              Save Draft
            </button>
            <button type="button" className={styles.action} onClick={onSubmit} disabled={locked}>
              Submit evaluation
            </button>
            <button
              type="button"
              className={styles.action}
              onClick={onPublish}
              disabled={!isAdmin || evaluation.status !== 'evaluated'}
            >
              Publish Marks
            </button>
            <button
              type="button"
              className={styles.action}
              onClick={onReEvaluate}
              disabled={!isAdmin || (evaluation.status !== 'evaluated' && evaluation.status !== 'published')}
            >
              Re-Evaluate
            </button>
          </div>
          <InfoBanner>Publish and Re-Evaluate need admin permission.</InfoBanner>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Audit History" open={open.audit} onToggle={() => toggle('audit')}>
        {evaluation.audit.length === 0 ? (
          <p className={styles.audit}>No activity yet.</p>
        ) : (
          <ol className={styles.auditList}>
            {evaluation.audit.map((entry, i) => (
              <li key={`${entry.at}-${i}`} className={styles.audit}>
                {formatDate(entry.at)} <span aria-hidden>|</span> {entry.by} <span aria-hidden>|</span> {entry.action}
              </li>
            ))}
          </ol>
        )}
      </CollapsibleCard>

      <CollapsibleCard title="Marking and Validation Rules" open={open.rules} onToggle={() => toggle('rules')}>
        <table className={`${styles.table} ${styles.rules}`}>
          <thead>
            <tr>
              <th scope="col" className={styles.no}>NO.</th>
              <th scope="col">Rule</th>
              <th scope="col">What Happens</th>
            </tr>
          </thead>
          <tbody>
            {VALIDATION_RULES.map(([rule, what], i) => (
              <tr key={rule}>
                <td className={styles.no}>{pad2(i + 1)}</td>
                <th scope="row">{rule}</th>
                <td>{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CollapsibleCard>
    </div>
  );
}