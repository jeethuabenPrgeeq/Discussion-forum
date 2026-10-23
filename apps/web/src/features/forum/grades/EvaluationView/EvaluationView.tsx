'use client';

import { useRef, useState } from 'react';
import { ArrowLeft, CalendarDays, ChevronDown, UserRound } from 'lucide-react';
import { DownloadIcon } from '@/components/icons';
import { ReadOnlyField } from '@/components/form/FormFields';
import InfoBanner from '@/components/ui/InfoBanner';
import MarkInput from '@/components/form/MarkInput';
import Select from '@/components/form/Select';
import Toast, { useToast } from '@/components/toast/Toast';
import EvaluationSummary from '@/features/forum/grades/EvaluationSummary/EvaluationSummary';
import StatusPill from '@/features/forum/ui/StatusPill';
import { useForum } from '@/features/forum/lib/store';
import { CURRENT_USER, WEEKS } from '@/features/forum/lib/mock';
import {
  POST_MAX,
  REPLY_MAX,
  RUBRIC,
  TOTAL_MAX,
  emptyEvaluation,
  formatDateTime,
  formatMark,
  formatNumericDate,
  initialsFor,
  markError,
  scoresOf,
  studentIdOf,
  submissionFor,
  wordCount,
} from '@/features/forum/lib/grading';
import { displayName } from '@/features/forum/lib/people';
import { pad2 } from '@/features/forum/lib/utils';
import type { Evaluation } from '@/features/forum/lib/types';
import styles from './EvaluationView.module.css';

type Step = 1 | 2 | 3 | 4;

const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: 'Participant' },
  { id: 2, label: `Original Post /${POST_MAX}` },
  { id: 3, label: `Peer reply /${REPLY_MAX * RUBRIC.replyCount}` },
  { id: 4, label: 'Final Summary' },
];

interface EvaluationViewProps {
  personId: string;
  onBack: () => void;
}

export default function EvaluationView({ personId, onBack }: EvaluationViewProps) {
  const { weekId, peopleFor, settingsFor, evaluationFor, saveEvaluation, updatePerson } = useForum();
  const people = peopleFor(weekId);
  const person = people.find((p) => p.id === personId);
  const settings = settingsFor(weekId);
  const week = WEEKS.find((w) => w.id === weekId) ?? WEEKS[0];
  const stored = person ? evaluationFor(weekId, person.id) ?? emptyEvaluation(person) : null;

  const [draft, setDraft] = useState<Evaluation | null>(stored);
  const [step, setStep] = useState<Step>(1);
  const [openReplies, setOpenReplies] = useState<Set<number>>(() => new Set([0]));
  const [showPost, setShowPost] = useState(false);
  const [showReply, setShowReply] = useState<number | null>(null);
  const topRef = useRef<HTMLElement>(null);
  const toast = useToast();

  if (!person || !draft || !stored) {
    return (
      <div className={styles.missing}>
        <p>This participant is no longer in the forum.</p>
        <button type="button" className={styles.back} onClick={onBack}>
          <ArrowLeft size={20} aria-hidden /> Participant
        </button>
      </div>
    );
  }

  const scores = scoresOf(draft);
  const submission = submissionFor(person, people);
  const locked = draft.status === 'published';
  const isAdmin = CURRENT_USER.role === 'admin';
  const dirty = JSON.stringify(draft) !== JSON.stringify(stored);
  const studentId = studentIdOf(person);

  const patch = (next: Partial<Evaluation>) => setDraft((d) => (d ? { ...d, ...next } : d));

  const setPostMark = (id: string, value: number | null) =>
    patch({ postMarks: { ...draft.postMarks, [id]: value } });

  const setReplyMark = (reply: number, id: string, value: number | null) =>
    patch({ replyMarks: draft.replyMarks.map((m, i) => (i === reply ? { ...m, [id]: value } : m)) });

  const go = (next: Step) => {
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const leave = () => {
    if (dirty && !window.confirm('Discard unsaved marks?')) return;
    onBack();
  };

  const persist = (next: Evaluation, action: string, message: string) => {
    const entry = { at: new Date().toISOString(), by: isAdmin ? 'Admin' : CURRENT_USER.name, action };
    const saved = { ...next, audit: [entry, ...next.audit] };
    saveEvaluation(weekId, saved);
    setDraft(saved);
    toast.show(message);
  };

  const lockedMessage = () => toast.show('Published marks are locked. Re-Evaluate to edit them.');

  const actions = {
    onSaveDraft: () => {
      if (locked) return lockedMessage();
      persist({ ...draft, status: 'draft' }, 'Saved draft.', 'Draft saved');
    },
    onSubmit: () => {
      if (locked) return lockedMessage();
      if (!scores.valid) return toast.show('Fix the highlighted marks first');
      if (!scores.complete) return toast.show('Every mark is required before submitting');
      persist(
        { ...draft, status: 'evaluated', evaluatedOn: draft.evaluatedOn || new Date().toISOString().slice(0, 10) },
        'Submitted evaluation.',
        'Evaluation submitted',
      );
    },
    onPublish: () => {
      if (!isAdmin) return toast.show('Only admins can publish marks');
      if (draft.status !== 'evaluated') return toast.show('Submit the evaluation before publishing');
      persist({ ...draft, status: 'published' }, 'Published marks.', 'Marks published');
      updatePerson(weekId, person.id, { grade: Math.round((scores.total / TOTAL_MAX) * settings.maxGrade) });
    },
    onReEvaluate: () => {
      if (!isAdmin) return toast.show('Only admins can re-evaluate');
      if (draft.status !== 'published' && draft.status !== 'evaluated') return toast.show('Nothing to re-evaluate yet');
      persist({ ...draft, status: 'draft' }, 'Reopened for re-evaluation.', 'Reopened for re-evaluation');
      updatePerson(weekId, person.id, { grade: null });
    },
  };

  const cards: [string, string][] = [
    ['Original Post', `${formatMark(scores.post)}/${POST_MAX}`],
    ...scores.replies.map((r, i): [string, string] => [`Reply ${i + 1}`, `${formatMark(r)}/${REPLY_MAX}`]),
    ['Total', `${formatMark(scores.total)}/${TOTAL_MAX}`],
    ['Percentage', `${scores.percentage}%`],
    ['Grade', scores.grade ?? '—'],
  ];

  return (
    <div className={styles.view}>
      <div className={styles.bar}>
        <button type="button" className={styles.back} onClick={leave}>
          <ArrowLeft size={20} strokeWidth={1.5} aria-hidden />
          Participant
        </button>
        <button type="button" className={styles.bulk} onClick={() => toast.show('Bulk grade upload is coming next')}>
          <DownloadIcon aria-hidden />
          Bulk Upload
        </button>
      </div>

      <section className={styles.banner} aria-label="Participant">
        <span className={styles.avatar} aria-hidden>
          {initialsFor(person)}
        </span>
        <div className={styles.bannerText}>
          <h2 className={styles.name} data-active={step > 1 || undefined}>
            {displayName(person)}
          </h2>
          <p className={styles.meta}>
            {studentId} <span aria-hidden>|</span> {settings.course} <span aria-hidden>|</span> {week.forumTitle}
          </p>
        </div>
      </section>

      <section ref={topRef} className={styles.overview} aria-label="Score overview">
        <dl className={styles.scores} data-highlight={step >= 3 || undefined}>
          {cards.map(([label, value]) => (
            <div key={label} className={styles.score}>
              <dt>{label}</dt>
              <dd data-grade={label === 'Grade' || undefined}>{value}</dd>
            </div>
          ))}
        </dl>
        <nav aria-label="Evaluation steps">
          <ol className={styles.stepper}>
            {STEPS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={styles.step}
                  aria-current={step === s.id ? 'step' : undefined}
                  onClick={() => go(s.id)}
                >
                  <span className={styles.stepNo}>{s.id}</span>
                  {s.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </section>

      {step === 1 && (
        <>
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Participant Information</h3>
            <div className={styles.grid3}>
              <ReadOnlyField label="Participant Name" icon={<UserRound size={20} strokeWidth={1.25} />} value={displayName(person)} />
              <ReadOnlyField label="Student ID" value={studentId} muted />
              <ReadOnlyField label="Course/ Subject" value={settings.course.replace(/^(\S+)\s/, '$1 | ')} />
              <div className={styles.field}>
                <span className={styles.label} id="eval-topic-label">
                  Discussion Topic
                </span>
                <Select
                  variant="field"
                  ariaLabel="Discussion Topic"
                  value={week.forumTitle}
                  options={[{ value: week.forumTitle, label: week.forumTitle }]}
                  onChange={() => undefined}
                />
              </div>
              <ReadOnlyField
                label="Submission Date"
                value={submission.post ? formatNumericDate(submission.post.submittedAt) : '—'}
                trailing={<CalendarDays size={24} strokeWidth={1.5} />}
              />
              <ReadOnlyField label="Rubric Version" value={RUBRIC.version} />
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Original Discussion Post</h3>
            {submission.post ? (
              <>
                <p className={styles.postText}>{submission.post.text}</p>
                <div className={styles.chips}>
                  <span className={styles.chip}>{wordCount(submission.post.text)} Words</span>
                  <span className={styles.chip}>Submitted on: {formatDateTime(submission.post.submittedAt)}</span>
                </div>
              </>
            ) : (
              <InfoBanner>No original post submitted. The zero-mark policy applies.</InfoBanner>
            )}
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Peer Replies</h3>
            <div className={styles.replies}>
              {submission.replies.map((reply, i) => {
                const open = openReplies.has(i);
                return (
                  <div key={i} className={styles.reply} data-open={open || undefined}>
                    <button
                      type="button"
                      className={styles.replyHead}
                      aria-expanded={open}
                      aria-controls={`reply-panel-${i}`}
                      onClick={() =>
                        setOpenReplies((s) => {
                          const next = new Set(s);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        })
                      }
                    >
                      <span className={styles.replyTitle}>Reply {i + 1}</span>
                      <StatusPill tone={reply ? 'green' : 'red'} size="md">
                        {reply ? 'Submitted' : 'Missing'}
                      </StatusPill>
                      <ChevronDown size={24} strokeWidth={1.5} className={styles.chevron} aria-hidden />
                    </button>
                    {open && (
                      <div id={`reply-panel-${i}`} className={styles.replyBody}>
                        {reply ? (
                          <>
                            <p className={styles.replyTo}>
                              To {reply.to}
                              <span className={styles.chip}>{formatDateTime(reply.submittedAt, ' | ')}</span>
                            </p>
                            <p className={styles.replyText}>{reply.text}</p>
                          </>
                        ) : (
                          <p className={styles.replyText}>Not submitted. This reply is marked 0.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {step === 2 && (
        <section className={styles.card}>
          <div className={styles.viewRow}>
            <button type="button" className={styles.viewBtn} aria-expanded={showPost} onClick={() => setShowPost((v) => !v)}>
              {showPost ? 'Hide Original Post' : 'View Original Post'}
            </button>
          </div>
          {showPost && <blockquote className={styles.quote}>{submission.post?.text ?? 'No original post submitted.'}</blockquote>}
          {draft.postMissing && <InfoBanner>No original post was submitted, so these marks are fixed at 0.</InfoBanner>}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col" className={styles.colNo}>NO.</th>
                  <th scope="col">Rubrics Parameters</th>
                  <th scope="col" className={styles.colMark}>Max Marks</th>
                  <th scope="col" className={styles.colMark}>Marks Awarded</th>
                  <th scope="col" className={styles.colNote}>Criterion Feedback</th>
                </tr>
              </thead>
              <tbody>
                {RUBRIC.postCriteria.map((c, i) => {
                  const value = draft.postMarks[c.id] ?? null;
                  const error = markError(value, c.max);
                  return (
                    <tr key={c.id} className={styles.row}>
                      <td data-label="No." className={styles.no}>{pad2(i + 1)}</td>
                      <th scope="row" className={styles.param}>{c.label}</th>
                      <td data-label="Max Marks">
                        <MarkInput label={`${c.label} maximum`} value={c.max} max={c.max} readOnly />
                      </td>
                      <td data-label="Marks Awarded">
                        <div className={styles.markCell}>
                          <MarkInput
                            label={`${c.label} marks`}
                            value={value}
                            max={c.max}
                            step={RUBRIC.precision}
                            invalid={!!error}
                            disabled={locked || draft.postMissing}
                            onChange={(v) => setPostMark(c.id, v)}
                          />
                          {error && <span className={styles.error} role="alert">{error}</span>}
                        </div>
                      </td>
                      <td data-label="Criterion Feedback">
                        <input
                          className={styles.note}
                          placeholder="Short note......"
                          aria-label={`${c.label} feedback`}
                          maxLength={200}
                          value={draft.postFeedback[c.id] ?? ''}
                          disabled={locked}
                          onChange={(e) => patch({ postFeedback: { ...draft.postFeedback, [c.id]: e.target.value } })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className={styles.totalRow}>
                  <th scope="row" colSpan={2}>Original Post Total</th>
                  <td data-label="Max">{POST_MAX}</td>
                  <td data-label="Awarded" colSpan={2}>
                    {formatMark(scores.post)}<span className={styles.outOf}>/{POST_MAX}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {step === 3 && (
        <>
          <InfoBanner raised>Each Reply is marked separately</InfoBanner>

          <section className={styles.card}>
            <div className={styles.viewRow}>
              {submission.replies.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={styles.viewBtn}
                  aria-pressed={showReply === i}
                  onClick={() => setShowReply((v) => (v === i ? null : i))}
                >
                  View Reply {i + 1}
                </button>
              ))}
            </div>
            {showReply !== null && (
              <blockquote className={styles.quote}>
                {submission.replies[showReply]?.text ?? 'Reply not submitted.'}
              </blockquote>
            )}

            <div className={styles.tableWrap}>
              <table className={styles.table} data-variant="reply">
                <thead>
                  <tr>
                    <th scope="col" className={styles.colNo}>NO.</th>
                    <th scope="col">Rubrics Parameters</th>
                    <th scope="col" className={styles.colMark}>Max Marks</th>
                    {draft.replyMarks.map((_, i) => (
                      <th key={i} scope="col" className={styles.colMark}>
                        Reply {i + 1} Marks{draft.replyMissing[i] && ' (missing)'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RUBRIC.replyCriteria.map((c, i) => (
                    <tr key={c.id} className={styles.row}>
                      <td data-label="No." className={styles.no}>{pad2(i + 1)}</td>
                      <th scope="row" className={styles.param}>{c.label}</th>
                      <td data-label="Max Marks">
                        <MarkInput label={`${c.label} maximum`} value={c.max} max={c.max} readOnly />
                      </td>
                      {draft.replyMarks.map((marks, r) => {
                        const value = marks[c.id] ?? null;
                        const error = markError(value, c.max);
                        return (
                          <td key={r} data-label={`Reply ${r + 1}`}>
                            <div className={styles.markCell}>
                              <MarkInput
                                label={`Reply ${r + 1} ${c.label} marks`}
                                value={value}
                                max={c.max}
                                step={RUBRIC.precision}
                                invalid={!!error}
                                disabled={locked || draft.replyMissing[r]}
                                onChange={(v) => setReplyMark(r, c.id, v)}
                              />
                              {error && <span className={styles.error} role="alert">{error}</span>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={styles.totalRow}>
                    <th scope="row" colSpan={2}>Reply Total</th>
                    <td data-label="Max">{REPLY_MAX}</td>
                    {scores.replies.map((r, i) => (
                      <td key={i} data-label={`Reply ${i + 1}`}>
                        {formatMark(r)}<span className={styles.outOf}>/{REPLY_MAX}</span>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Reply Feedback</h3>
            <div className={styles.grid2}>
              {draft.replyFeedback.map((text, i) => (
                <label key={i} className={styles.field}>
                  <span className={styles.label}>Reply {i + 1} feedback (optional)</span>
                  <input
                    className={styles.input}
                    placeholder="Add Comment"
                    maxLength={500}
                    value={text}
                    disabled={locked}
                    onChange={(e) =>
                      patch({ replyFeedback: draft.replyFeedback.map((t, j) => (j === i ? e.target.value : t)) })
                    }
                  />
                </label>
              ))}
            </div>
          </section>
        </>
      )}

      {step === 4 && (
        <EvaluationSummary
          evaluation={draft}
          scores={scores}
          locked={locked}
          isAdmin={isAdmin}
          onChange={patch}
          {...actions}
        />
      )}

      <div className={styles.footer}>
        {step > 1 ? (
          <button type="button" className={styles.navBtn} onClick={() => go((step - 1) as Step)}>
            Previous
          </button>
        ) : (
          <span />
        )}
        {step < 4 && (
          <button type="button" className={`${styles.navBtn} ${styles.next}`} onClick={() => go((step + 1) as Step)}>
            Next
          </button>
        )}
      </div>

      <Toast message={toast.message} />
    </div>
  );
}
