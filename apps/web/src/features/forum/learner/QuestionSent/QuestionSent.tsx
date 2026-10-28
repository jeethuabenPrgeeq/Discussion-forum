'use client';

import { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { ArrowLeft, CircleCheck, Info, Paperclip } from 'lucide-react';
import { ReadOnlyField } from '@/components/form/FormFields';
import styles from './QuestionSent.module.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function newQuestionReference() {
  return `Q-${1000 + Math.floor(Math.random() * 9000)}`;
}

export function formatSentAt(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export interface SentQuestion {
  reference: string;
  to: string;
  evaluatorName: string;
  type: string;
  about: string;
  part?: string;
  sentAt: string;
  html: string;
  attachments: string[];
  emailMe: boolean;
}

interface QuestionSentProps {
  question: SentQuestion;
  onBack: () => void;
  onAskAnother: () => void;
}

export default function QuestionSent({ question, onBack, onAskAnother }: QuestionSentProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const safeHtml = DOMPurify.sanitize(question.html, { USE_PROFILES: { html: true } });
  const showPart = !!question.part && question.part !== 'Whole Section';

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className={styles.view}>
      <div className={styles.topBar}>
        <button type="button" className={styles.back} onClick={onBack}>
          <ArrowLeft size={20} strokeWidth={1.5} aria-hidden />
          My grade
        </button>
        <nav aria-label="Breadcrumb" className={styles.crumbs}>
          <span>Grades</span>
          <span aria-hidden="true">›</span>
          <span aria-current="page">Ask a question</span>
        </nav>
      </div>

      <section className={styles.card} aria-labelledby="question-sent-title">
        <h2 id="question-sent-title" ref={headingRef} tabIndex={-1} className={styles.title}>
          <CircleCheck size={22} strokeWidth={2} className={styles.titleIcon} aria-hidden />
          Question sent
        </h2>

        <p className={styles.banner} role="status">
          <Info size={18} strokeWidth={1.75} aria-hidden />
          {question.evaluatorName} will reply here{question.emailMe ? ' and by email' : ''}. Replies usually arrive within 2
          working days.
        </p>

        <div className={styles.grid}>
          <div className={styles.plainField}>
            <span className={styles.label}>Reference</span>
            <span className={styles.reference}>{question.reference}</span>
          </div>
          <div className={styles.plainField}>
            <span className={styles.label}>Status</span>
            <span className={styles.status}>Awaiting reply</span>
          </div>
          <ReadOnlyField label="To" value={question.to} />
          <ReadOnlyField label="Type" value={question.type} />
          <ReadOnlyField label="About" value={question.about} />
          {showPart && <ReadOnlyField label="Which part" value={question.part ?? ''} />}
          <ReadOnlyField label="Sent" value={question.sentAt} />
        </div>
      </section>

      <section className={styles.card} aria-labelledby="question-conversation-title">
        <h2 id="question-conversation-title" className={styles.sectionTitle}>
          Conversation
        </h2>

        <article className={styles.message} aria-label="Your question">
          <p className={styles.messageMeta}>You · just now</p>
          <div className={styles.messageBody} dangerouslySetInnerHTML={{ __html: safeHtml }} />
          {question.attachments.length > 0 && (
            <ul className={styles.files} aria-label="Attachments">
              {question.attachments.map((name) => (
                <li key={name} className={styles.file}>
                  <Paperclip size={14} aria-hidden />
                  <span className={styles.fileName}>{name}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <p className={styles.waiting}>Waiting for {question.evaluatorName} to reply...</p>

        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={onBack}>
            Back to my grade
          </button>
          <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={onAskAnother}>
            Ask another question
          </button>
        </div>
      </section>
    </div>
  );
}