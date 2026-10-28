"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { ArrowLeft, Paperclip } from "lucide-react";
import { EditorField, ReadOnlyField } from "@/components/form/FormFields";
import Toast, { useToast } from "@/components/toast/Toast";
import { api, ApiError, fileUrl, type UploadedFile } from "@/features/forum/lib/api";
import { ASK_ABOUT_OPTIONS, ASK_TYPE_OPTIONS } from "@/features/forum/lib/learnerGrade";
import { useForum } from "@/features/forum/lib/store";
import styles from "./QuestionsView.module.css";

export interface ApiQuestion {
  id: string;
  reference: string;
  forumId: string | null;
  learner: string;
  evaluator: string;
  type: string;
  about: string;
  part: string | null;
  body: string;
  status: "awaiting" | "answered";
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  attachments: UploadedFile[];
}

type Filter = "all" | "awaiting" | "answered";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "awaiting", label: "Awaiting" },
  { value: "answered", label: "Answered" },
];

export const labelOf = (options: { value: string; label: string }[], value: string | null) =>
  options.find((o) => o.value === value)?.label ?? value ?? "-";

export const formatWhen = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "-";

const sanitize = (html: string) => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });

const hasText = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\u200B/g, "").trim() !== "";

export function FileChips({ files }: { files: UploadedFile[] }) {
  if (!files.length) return null;
  return (
    <ul className={styles.files} aria-label="Attachments">
      {files.map((f) => (
        <li key={f.id}>
          <a className={styles.file} href={fileUrl(f.url)} target="_blank" rel="noopener noreferrer">
            <Paperclip size={14} aria-hidden />
            <span className={styles.fileName}>{f.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function QuestionsView() {
  const { weekId, forumIdFor } = useForum();
  const forumId = forumIdFor(weekId);
  const toast = useToast();
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api<ApiQuestion[]>("/questions");
      setQuestions(list.filter((q) => !q.forumId || q.forumId === forumId));
    } catch (error) {
      toast.show(error instanceof ApiError ? error.message : "Could not load questions");
    } finally {
      setLoading(false);
    }
  }, [forumId]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      awaiting: questions.filter((q) => q.status === "awaiting").length,
      answered: questions.filter((q) => q.status === "answered").length,
    }),
    [questions],
  );

  const visible = filter === "all" ? questions : questions.filter((q) => q.status === filter);
  const open = questions.find((q) => q.id === openId);

  const openQuestion = (id: string) => {
    setOpenId(id);
    setAnswer("");
    setEditorKey((k) => k + 1);
  };

  const send = async () => {
    if (!open || !hasText(answer) || sending) return;
    setSending(true);
    try {
      const updated = await api<ApiQuestion>(`/questions/${open.id}/answer`, { method: "POST", json: { body: sanitize(answer) } });
      setQuestions((list) => list.map((q) => (q.id === updated.id ? updated : q)));
      setAnswer("");
      toast.show(`Answer sent. ${updated.learner} has been notified.`);
    } catch (error) {
      toast.show(error instanceof ApiError ? error.message : "Could not send the answer");
    } finally {
      setSending(false);
    }
  };

  if (open) {
    return (
      <div className={styles.view}>
        <button type="button" className={styles.back} onClick={() => setOpenId(null)}>
          <ArrowLeft size={20} strokeWidth={1.5} aria-hidden />
          Questions
        </button>

        <section className={styles.card} aria-labelledby="question-title">
          <div className={styles.headRow}>
            <h2 id="question-title" className={styles.title}>
              {open.reference}
            </h2>
            <span className={styles.pill} data-status={open.status}>
              {open.status === "awaiting" ? "Awaiting reply" : "Answered"}
            </span>
          </div>
          <div className={styles.grid}>
            <ReadOnlyField label="Learner" value={open.learner} />
            <ReadOnlyField label="Type" value={labelOf(ASK_TYPE_OPTIONS, open.type)} />
            <ReadOnlyField label="About" value={labelOf(ASK_ABOUT_OPTIONS, open.about)} />
            {open.part && <ReadOnlyField label="Which part" value={open.part} />}
            <ReadOnlyField label="Asked" value={formatWhen(open.createdAt)} />
            {open.answeredAt && <ReadOnlyField label="Answered" value={formatWhen(open.answeredAt)} />}
          </div>
        </section>

        <section className={styles.card} aria-labelledby="conversation-title">
          <h2 id="conversation-title" className={styles.sectionTitle}>
            Conversation
          </h2>
          <article className={styles.message} aria-label="Question">
            <p className={styles.meta}>{open.learner} asked</p>
            <div className={styles.body} dangerouslySetInnerHTML={{ __html: sanitize(open.body) }} />
            <FileChips files={open.attachments} />
          </article>

          {open.answer ? (
            <article className={styles.message} data-answer aria-label="Answer">
              <p className={styles.meta}>{open.evaluator} answered</p>
              <div className={styles.body} dangerouslySetInnerHTML={{ __html: sanitize(open.answer) }} />
            </article>
          ) : (
            <div className={styles.answerBox}>
              <EditorField key={`answer-${editorKey}`} label="Your answer" value={answer} onChange={setAnswer} placeholder="Write your answer" />
              <div className={styles.actions}>
                <button type="button" className={styles.btn} onClick={() => setOpenId(null)} disabled={sending}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.primary}`}
                  onClick={() => void send()}
                  disabled={!hasText(answer) || sending}
                >
                  {sending ? "Sending…" : "Send Answer"}
                </button>
              </div>
            </div>
          )}
        </section>

        <Toast message={toast.message} />
      </div>
    );
  }

  return (
    <div className={styles.view}>
      <ul className={styles.stats} aria-label="Question summary">
        <li className={styles.stat}>
          <span className={styles.statValue} data-tone="orange">
            {String(counts.awaiting).padStart(2, "0")}
          </span>
          <span className={styles.statLabel}>Awaiting reply</span>
        </li>
        <li className={styles.stat}>
          <span className={styles.statValue} data-tone="green">
            {String(counts.answered).padStart(2, "0")}
          </span>
          <span className={styles.statLabel}>Answered</span>
        </li>
      </ul>

      <section className={styles.card} aria-label="Learner questions">
        <div className={styles.filterRow} role="group" aria-label="Filter questions">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={styles.chip}
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Ref</th>
                <th scope="col">Learner</th>
                <th scope="col">Type</th>
                <th scope="col">About</th>
                <th scope="col">Asked</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className={styles.srOnly}>Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    {loading ? "Loading questions…" : "No questions for this week yet."}
                  </td>
                </tr>
              ) : (
                visible.map((q) => (
                  <tr key={q.id}>
                    <td className={styles.ref}>{q.reference}</td>
                    <td>{q.learner}</td>
                    <td>{labelOf(ASK_TYPE_OPTIONS, q.type)}</td>
                    <td>{labelOf(ASK_ABOUT_OPTIONS, q.about)}</td>
                    <td>{formatWhen(q.createdAt)}</td>
                    <td>
                      <span className={styles.pill} data-status={q.status}>
                        {q.status === "awaiting" ? "Awaiting" : "Answered"}
                      </span>
                    </td>
                    <td>
                      <button type="button" className={styles.link} onClick={() => openQuestion(q.id)}>
                        {q.status === "awaiting" ? "Answer" : "View"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Toast message={toast.message} />
    </div>
  );
}