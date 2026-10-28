"use client";

import { useState } from "react";
import DOMPurify from "dompurify";
import { ArrowLeft, Info } from "lucide-react";
import RadioDropdown from "@/components/form/RadioDropdown";
import { EditorField } from "@/components/form/FormFields";
import ConfirmDialog from "@/components/ui/ConfirmDialog/ConfirmDialog";
import MessageDialog from "@/components/ui/MessageDialog/MessageDialog";
import AttachBox from "@/features/forum/learner/AttachBox/AttachBox";
import QuestionSent, { formatSentAt, newQuestionReference, type SentQuestion } from "@/features/forum/learner/QuestionSent/QuestionSent";
import {
  ASK_ABOUT_OPTIONS,
  ASK_COURSE_OPTIONS,
  ASK_TO_OPTIONS,
  ASK_TYPE_OPTIONS,
  getPartOptions,
  type AskAbout,
  type AskType,
} from "@/features/forum/lib/learnerGrade";
import { api, ApiError, uploadFiles } from "@/features/forum/lib/api";
import { useForum } from "@/features/forum/lib/store";
import styles from "./LearnerAskEvaluator.module.css";

const POPUP_MS = 3000;

interface ApiQuestion {
  id?: string;
  number?: number;
  reference?: string;
  createdAt?: string;
  attachments?: { name: string }[];
}

const plainText = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\u200B/g, "")
    .trim();

const labelOf = (options: { value: string; label: string }[], value: string) => options.find((o) => o.value === value)?.label ?? value;

const referenceOf = (q: ApiQuestion | undefined) => {
  if (q?.reference) return q.reference;
  if (typeof q?.number === "number") return `Q-${1000 + q.number}`;
  return newQuestionReference();
};

interface LearnerAskEvaluatorProps {
  evaluator: string;
  onBack: () => void;
  onSent?: () => void;
}

export default function LearnerAskEvaluator({ evaluator, onBack }: LearnerAskEvaluatorProps) {
  const { weekId, forumIdFor } = useForum();
  const [to, setTo] = useState(ASK_TO_OPTIONS[0].value);
  const [course, setCourse] = useState(ASK_COURSE_OPTIONS[0].value);
  const [type, setType] = useState<AskType>("marks");
  const [about, setAbout] = useState<AskAbout>("overall");
  const [part, setPart] = useState("whole");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [emailMe, setEmailMe] = useState(true);
  const [sendCopy, setSendCopy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState<SentQuestion | null>(null);

  const hasText = plainText(message) !== "";
  const dirty = hasText || files.length > 0;

  const resetForm = () => {
    setTo(ASK_TO_OPTIONS[0].value);
    setCourse(ASK_COURSE_OPTIONS[0].value);
    setType("marks");
    setAbout("overall");
    setPart("whole");
    setMessage("");
    setFiles([]);
    setEmailMe(true);
    setSendCopy(false);
  };

  const changeAbout = (value: AskAbout) => {
    setAbout(value);
    setPart("whole");
  };

  const cancel = () => {
    if (sending) return;
    if (dirty) {
      setConfirmOpen(true);
      return;
    }
    onBack();
  };

  const send = async () => {
    if (!hasText || sending) return;
    const html = DOMPurify.sanitize(message, { USE_PROFILES: { html: true } });
    setSending(true);
    try {
      const uploaded = files.length ? await uploadFiles(files) : [];
      const created = await api<ApiQuestion>("/questions", {
        method: "POST",
        json: {
          forumId: forumIdFor(weekId),
          type,
          about,
          part: part === "whole" ? undefined : part,
          body: html,
          emailMe,
          sendCopy,
          attachmentIds: uploaded.length ? uploaded.map((f) => f.id) : undefined,
        },
      });
      setSent({
        reference: referenceOf(created),
        to: labelOf(ASK_TO_OPTIONS, to),
        evaluatorName: evaluator,
        type: labelOf(ASK_TYPE_OPTIONS, type),
        about: labelOf(ASK_ABOUT_OPTIONS, about),
        part: labelOf(getPartOptions(about), part),
        sentAt: formatSentAt(created?.createdAt ? new Date(created.createdAt) : new Date()),
        html,
        attachments: (created?.attachments ?? uploaded).map((f) => f.name),
        emailMe,
      });
      setPopupOpen(true);
    } catch (error) {
      setSendError(error instanceof ApiError ? error.message : "Could not reach the server. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const askAnother = () => {
    resetForm();
    setPopupOpen(false);
    setSent(null);
  };

  const popup = (
    <MessageDialog
      open={popupOpen}
      title="Question sent"
      message={sent ? `Your question was sent to ${evaluator} successfully. Reference ${sent.reference}.` : `Your question was sent to ${evaluator} successfully.`}
      autoCloseMs={POPUP_MS}
      onClose={() => setPopupOpen(false)}
    />
  );

  if (sent) {
    return (
      <>
        <QuestionSent question={sent} onBack={onBack} onAskAnother={askAnother} />
        {popup}
      </>
    );
  }

  return (
    <div className={styles.view}>
      <button type="button" className={styles.back} onClick={cancel}>
        <ArrowLeft size={18} strokeWidth={1.75} aria-hidden />
        My grade
      </button>

      <section className={styles.card} aria-labelledby="ask-title">
        <h2 id="ask-title" className={styles.title}>
          Ask your Evaluator
        </h2>

        <p className={styles.banner} role="note">
          <Info size={22} strokeWidth={1.75} aria-hidden className={styles.bannerIcon} />
          {type === "recheck"
            ? `Goes to ${evaluator}. A re-check is reviewed against the rubric and your marks may go up or down.`
            : `Goes to ${evaluator}. Asking does not change your marks. For a re-check, choose "Request a re-check".`}
        </p>

        <div className={styles.grid}>
          <RadioDropdown variant="field" label="To" value={to} options={ASK_TO_OPTIONS} onChange={setTo} />
          <RadioDropdown variant="field" label="Course" value={course} options={ASK_COURSE_OPTIONS} onChange={setCourse} />
          <RadioDropdown variant="field" label="Type" value={type} options={ASK_TYPE_OPTIONS} onChange={setType} />
          <RadioDropdown variant="field" label="About" value={about} options={ASK_ABOUT_OPTIONS} onChange={changeAbout} />
        </div>

        <RadioDropdown variant="field" label="Which Part ? (Optional)" value={part} options={getPartOptions(about)} onChange={setPart} />

        <div className={styles.message}>
          <EditorField label="Your Question" value={message} onChange={setMessage} placeholder="Type your question" />
        </div>

        <div className={styles.attachGroup}>
          <span className={styles.label}>Attach a File ( Optional)</span>
          <AttachBox files={files} onChange={setFiles} />
        </div>

        <div className={styles.checks}>
          <label className={styles.row}>
            <input type="checkbox" className={styles.input} checked={emailMe} onChange={(e) => setEmailMe(e.target.checked)} />
            <span className={styles.box} aria-hidden="true">
              <svg className={styles.tick} viewBox="0 0 16 16">
                <rect width="16" height="16" rx="3" />
                <path d="M5 8.2 7 10.2 11 6" />
              </svg>
            </span>
            <span className={styles.text}>Email me when answered</span>
          </label>
          <label className={styles.row}>
            <input type="checkbox" className={styles.input} checked={sendCopy} onChange={(e) => setSendCopy(e.target.checked)} />
            <span className={styles.box} aria-hidden="true">
              <svg className={styles.tick} viewBox="0 0 16 16">
                <rect width="16" height="16" rx="3" />
                <path d="M5 8.2 7 10.2 11 6" />
              </svg>
            </span>
            <span className={styles.text}>Send me a copy</span>
          </label>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={cancel} disabled={sending}>
            Cancel
          </button>
          <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={() => void send()} disabled={!hasText || sending}>
            {sending ? (files.length ? "Uploading…" : "Sending…") : "Send Question"}
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Discard your question?"
        message="What you typed and any attached files will be lost."
        confirmLabel="Discard"
        onConfirm={() => {
          setConfirmOpen(false);
          onBack();
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      <MessageDialog open={sendError !== null} title="Question not sent" message={sendError ?? ""} onClose={() => setSendError(null)} />
    </div>
  );
}