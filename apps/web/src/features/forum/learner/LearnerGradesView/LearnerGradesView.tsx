"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Download } from "lucide-react";
import { ReadOnlyField } from "@/components/form/FormFields";
import Toast, { useToast } from "@/components/toast/Toast";
import LearnerAskEvaluator from "@/features/forum/learner/LearnerAskEvaluator/LearnerAskEvaluator";
import { useForum } from "@/features/forum/lib/store";
import { readSessionUser, type SessionUser } from "@/features/auth/lib/session";
import { POST_MAX, REPLY_MAX, RUBRIC, TOTAL_MAX, formatDate, formatMark, gradeFor, scoresOf } from "@/features/forum/lib/grading";
import type { Evaluation } from "@/features/forum/lib/types";
import styles from "./LearnerGradesView.module.css";

type SectionKey = "participant" | "summary" | "original" | "peer" | "feedback";

const pad2 = (n: number) => (Number.isInteger(n) ? String(n).padStart(2, "0") : formatMark(n));

const plain = (html: string | undefined) =>
  (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "-";

const studentId = (id: string) => `S-${id.slice(0, 4).toUpperCase()}`;

function normalize(raw: Evaluation): Evaluation {
  return {
    ...raw,
    postMarks: raw.postMarks ?? {},
    postFeedback: raw.postFeedback ?? {},
    replyMissing: raw.replyMissing ?? [],
    replyMarks: Array.from({ length: RUBRIC.replyCount }, (_, i) => raw.replyMarks?.[i] ?? {}),
    replyFeedback: raw.replyFeedback ?? [],
    overallFeedback: raw.overallFeedback ?? "",
    improvement: raw.improvement ?? "",
    evaluator: raw.evaluator ?? "",
    evaluatedOn: raw.evaluatedOn ?? "",
    audit: raw.audit ?? [],
  };
}

function GradeSection({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionHead}>
        <button type="button" className={styles.sectionToggle} aria-expanded={open} aria-controls={`${id}-body`} onClick={onToggle}>
          <span>{title}</span>
          <ChevronDown size={32} strokeWidth={1.75} aria-hidden className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} />
        </button>
      </h3>
      {open && (
        <div id={`${id}-body`} className={styles.sectionBody}>
          {children}
        </div>
      )}
    </section>
  );
}

function MarkBox({ value }: { value: number | string }) {
  return <span className={styles.markBox}>{typeof value === "number" ? pad2(value) : value}</span>;
}

function MarkBar({ marks, max }: { marks: number; max: number }) {
  const percent = max ? Math.round((marks / max) * 100) : 0;
  return (
    <div className={styles.bar}>
      <span className={styles.track} role="progressbar" aria-valuenow={marks} aria-valuemin={0} aria-valuemax={max} aria-label={`${marks} of ${max}`}>
        <span className={styles.fill} style={{ width: `${percent}%` }} />
      </span>
      <span className={styles.barLabel}>
        <strong>{formatMark(marks)}</strong>/{max}
      </span>
    </div>
  );
}

export default function LearnerGradesView() {
  const toast = useToast();
  const { weekId, evaluationFor, forumDetailFor } = useForum();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mode, setMode] = useState<"grade" | "ask">("grade");
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    participant: false,
    summary: false,
    original: false,
    peer: false,
    feedback: false,
  });

  useEffect(() => {
    setUser(readSessionUser());
  }, []);

  const raw = user ? evaluationFor(weekId, user.id) : undefined;
  const evaluation = raw && raw.status === "published" ? normalize(raw) : null;
  const forum = forumDetailFor(weekId);
  const toggle = (key: SectionKey) => setOpen((o) => ({ ...o, [key]: !o[key] }));
  const evaluatorName = evaluation?.evaluator || forum.instructor;

  if (mode === "ask") {
    return (
      <LearnerAskEvaluator
        evaluator={evaluatorName}
        onBack={() => setMode("grade")}
        onSent={() => {
          setMode("grade");
          toast.show(`Question sent to ${evaluatorName}`);
        }}
      />
    );
  }

  if (!evaluation) {
    return (
      <div className={styles.view}>
        <div className={styles.head}>
          <h2 className={styles.headTitle}>My Grade</h2>
        </div>
        <div className={styles.empty}>Your grade hasn&apos;t been published yet. You&apos;ll get an alert when it&apos;s out.</div>
        <Toast message={toast.message} />
      </div>
    );
  }

  const scores = scoresOf(evaluation);
  const letter = scores.grade ?? gradeFor(scores.percentage);
  const replyIndexes = Array.from({ length: RUBRIC.replyCount }, (_, i) => i);

  const cards = [
    { key: "total", value: `${formatMark(scores.total)}/${TOTAL_MAX}`, label: "Grand Total", tone: styles.purple },
    { key: "percent", value: `${scores.percentage}%`, label: "Percentage", tone: styles.blue },
    { key: "letter", value: letter, label: "Final Grade", tone: styles.gradient },
    { key: "status", value: "Published", label: "Status", tone: styles.green },
  ];

  return (
    <div className={styles.view}>
      <div className={styles.head}>
        <h2 className={styles.headTitle}>My Grade</h2>
      </div>

      <ul className={styles.cards}>
        {cards.map((c) => (
          <li key={c.key} className={styles.card}>
            <span className={`${styles.cardValue} ${c.tone}`}>{c.value}</span>
            <span className={styles.cardLabel}>{c.label}</span>
          </li>
        ))}
      </ul>

      <GradeSection id="grade-participant" title="Participant Information" open={open.participant} onToggle={() => toggle("participant")}>
        <div className={styles.infoGrid}>
          <ReadOnlyField label="Participants name" value={user?.name ?? "-"} />
          <ReadOnlyField label="Student Id" value={user ? studentId(user.id) : "-"} />
          <ReadOnlyField label="Course/Subject" value={forum.course} />
          <ReadOnlyField label="Discussion Topic" value={forum.title} />
          <ReadOnlyField label="Submission date" value={evaluation.evaluatedOn ? formatDate(evaluation.evaluatedOn) : "-"} />
          <ReadOnlyField label="Rubric Version" value={RUBRIC.version} />
        </div>
      </GradeSection>

      <GradeSection id="grade-summary" title="Final Marks Summary" open={open.summary} onToggle={() => toggle("summary")}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <colgroup>
              <col className={styles.colWide} />
              <col className={styles.colMid} />
              <col className={styles.colMid} />
              <col className={styles.colBar} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Assessment Component</th>
                <th scope="col" className={styles.center}>Maximum Marks</th>
                <th scope="col" className={styles.center}>Marks Obtained</th>
                <th scope="col">
                  <span className={styles.srOnly}>Progress</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Original discussion post</td>
                <td className={styles.center}><MarkBox value={POST_MAX} /></td>
                <td className={styles.center}><MarkBox value={scores.post} /></td>
                <td><MarkBar marks={scores.post} max={POST_MAX} /></td>
              </tr>
              {replyIndexes.map((i) => (
                <tr key={i}>
                  <td>Peer reply {i + 1}</td>
                  <td className={styles.center}><MarkBox value={REPLY_MAX} /></td>
                  <td className={styles.center}><MarkBox value={scores.replies[i] ?? 0} /></td>
                  <td><MarkBar marks={scores.replies[i] ?? 0} max={REPLY_MAX} /></td>
                </tr>
              ))}
              <tr className={styles.totalRow}>
                <td>Grand Total</td>
                <td className={styles.center}>{TOTAL_MAX}</td>
                <td className={styles.center}>{formatMark(scores.total)}</td>
                <td />
              </tr>
              <tr>
                <td>Percentage</td>
                <td className={styles.center}><MarkBox value="100%" /></td>
                <td className={styles.center}><MarkBox value={`${scores.percentage}%`} /></td>
                <td />
              </tr>
              <tr>
                <td>Final Grade</td>
                <td className={styles.center}>Configured Scale</td>
                <td className={styles.center}>
                  <span className={`${styles.letter} ${styles.gradient}`}>{letter}</span>
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </GradeSection>

      <GradeSection id="grade-original" title="Original post (Marks and comments)" open={open.original} onToggle={() => toggle("original")}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <colgroup>
              <col className={styles.colNo} />
              <col className={styles.colWide} />
              <col className={styles.colMid} />
              <col className={styles.colMid} />
              <col className={styles.colComment} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">NO.</th>
                <th scope="col">Rubrics Parameters</th>
                <th scope="col" className={styles.center}>Max Marks</th>
                <th scope="col" className={styles.center}>My marks</th>
                <th scope="col">Evaluator Comments</th>
              </tr>
            </thead>
            <tbody>
              {RUBRIC.postCriteria.map((c, i) => {
                const comment = evaluation.postFeedback[c.id];
                return (
                  <tr key={c.id}>
                    <td>{pad2(i + 1)}</td>
                    <td>{c.label}</td>
                    <td className={styles.center}><MarkBox value={c.max} /></td>
                    <td className={styles.center}><MarkBox value={evaluation.postMarks[c.id] ?? 0} /></td>
                    <td className={comment ? undefined : styles.center}>{comment || "-"}</td>
                  </tr>
                );
              })}
              <tr className={styles.totalRow}>
                <td colSpan={2}>Original Post Total</td>
                <td className={styles.center}>{POST_MAX}</td>
                <td className={styles.center}>
                  {formatMark(scores.post)}
                  <span className={styles.muted}>/{POST_MAX}</span>
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </GradeSection>

      <GradeSection id="grade-peer" title="Peer Replies (Marks)" open={open.peer} onToggle={() => toggle("peer")}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <colgroup>
              <col className={styles.colNo} />
              <col className={styles.colWide} />
              <col className={styles.colMid} />
              {replyIndexes.map((i) => (
                <col key={i} className={styles.colMid} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col">NO.</th>
                <th scope="col">Rubric parameter</th>
                <th scope="col" className={styles.center}>Max per Reply</th>
                {replyIndexes.map((i) => (
                  <th key={i} scope="col" className={styles.center}>
                    Reply {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RUBRIC.replyCriteria.map((c, i) => (
                <tr key={c.id}>
                  <td>{pad2(i + 1)}</td>
                  <td>{c.label}</td>
                  <td className={styles.center}><MarkBox value={c.max} /></td>
                  {replyIndexes.map((j) => (
                    <td key={j} className={styles.center}>
                      <MarkBox value={evaluation.replyMarks[j]?.[c.id] ?? 0} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className={styles.totalRow}>
                <td colSpan={2}>Grand Total</td>
                <td className={styles.center}>{REPLY_MAX}</td>
                {replyIndexes.map((i) => (
                  <td key={i} className={styles.center}>
                    {formatMark(scores.replies[i] ?? 0)}
                    <span className={styles.muted}>/{REPLY_MAX}</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </GradeSection>

      <GradeSection id="grade-feedback" title="Evaluator Feedback" open={open.feedback} onToggle={() => toggle("feedback")}>
        <ReadOnlyField label="Overall Feedback" value={plain(evaluation.overallFeedback)} />
        <ReadOnlyField label="Areas for Improvement" value={plain(evaluation.improvement)} />
        <div className={styles.feedbackRow}>
          <ReadOnlyField label="Evaluator Name" value={evaluatorName} trailing={<ChevronDown size={20} strokeWidth={1.75} />} />
          <ReadOnlyField label="Evaluation Date" value={evaluation.evaluatedOn ? formatDate(evaluation.evaluatedOn) : "-"} />
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => {
              setOpen({ participant: true, summary: true, original: true, peer: true, feedback: true });
              window.setTimeout(() => window.print(), 100);
            }}
          >
            <Download size={18} strokeWidth={1.5} aria-hidden />
            Download PDF
          </button>
          <button type="button" className={`${styles.actionBtn} ${styles.primary}`} onClick={() => setMode("ask")}>
            Ask a question
          </button>
        </div>
      </GradeSection>

      <Toast message={toast.message} />
    </div>
  );
}