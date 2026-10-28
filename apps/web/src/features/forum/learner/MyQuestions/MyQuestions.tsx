"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { ChevronDown } from "lucide-react";
import { api } from "@/features/forum/lib/api";
import { ASK_ABOUT_OPTIONS, ASK_TYPE_OPTIONS } from "@/features/forum/lib/learnerGrade";
import { useForum } from "@/features/forum/lib/store";
import { FileChips, formatWhen, labelOf, type ApiQuestion } from "@/features/forum/questions/QuestionsView/QuestionsView";
import styles from "./MyQuestions.module.css";

const sanitize = (html: string) => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });

export default function MyQuestions() {
  const { weekId, forumIdFor } = useForum();
  const forumId = forumIdFor(weekId);
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<ApiQuestion[]>("/questions")
      .then((list) => {
        if (!cancelled) setQuestions(list.filter((q) => !q.forumId || q.forumId === forumId));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [forumId]);

  if (questions.length === 0) return null;

  return (
    <section className={styles.card} aria-labelledby="my-questions-title">
      <h2 id="my-questions-title" className={styles.title}>
        My Questions
      </h2>
      <ul className={styles.list}>
        {questions.map((q) => {
          const open = openId === q.id;
          return (
            <li key={q.id} className={styles.item}>
              <button
                type="button"
                className={styles.row}
                aria-expanded={open}
                aria-controls={`question-${q.id}`}
                onClick={() => setOpenId(open ? null : q.id)}
              >
                <span className={styles.ref}>{q.reference}</span>
                <span className={styles.summary}>
                  {labelOf(ASK_TYPE_OPTIONS, q.type)} · {labelOf(ASK_ABOUT_OPTIONS, q.about)}
                </span>
                <span className={styles.pill} data-status={q.status}>
                  {q.status === "awaiting" ? "Awaiting reply" : "Answered"}
                </span>
                <ChevronDown size={20} strokeWidth={1.75} aria-hidden className={open ? styles.chevronOpen : styles.chevron} />
              </button>
              {open && (
                <div id={`question-${q.id}`} className={styles.detail}>
                  <article className={styles.message}>
                    <p className={styles.meta}>You asked · {formatWhen(q.createdAt)}</p>
                    <div className={styles.body} dangerouslySetInnerHTML={{ __html: sanitize(q.body) }} />
                    <FileChips files={q.attachments} />
                  </article>
                  {q.answer ? (
                    <article className={styles.message} data-answer>
                      <p className={styles.meta}>
                        {q.evaluator} answered · {formatWhen(q.answeredAt)}
                      </p>
                      <div className={styles.body} dangerouslySetInnerHTML={{ __html: sanitize(q.answer) }} />
                    </article>
                  ) : (
                    <p className={styles.waiting}>Waiting for {q.evaluator} to reply…</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}