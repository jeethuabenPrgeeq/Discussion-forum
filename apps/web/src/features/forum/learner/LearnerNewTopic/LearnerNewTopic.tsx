"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { ArrowLeft } from "lucide-react";
import { EditorField, SelectField, SwitchField } from "@/components/form/FormFields";
import Toast, { useToast } from "@/components/toast/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog/ConfirmDialog";
import AttachBox from "@/features/forum/learner/AttachBox/AttachBox";
import { FORM_GROUP_OPTIONS, SUBJECT_OPTIONS, type NewTopicInput } from "@/features/forum/lib/learner";
import styles from "./LearnerNewTopic.module.css";

interface TopicDraft {
  subject: string;
  message: string;
  group: string;
  subscribe: boolean;
  notify: boolean;
}

type Errors = Partial<Record<"subject" | "message", string>>;

const EMPTY: TopicDraft = {
  subject: "",
  message: "",
  group: FORM_GROUP_OPTIONS[0].value,
  subscribe: true,
  notify: true,
};

const plainText = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();

interface LearnerNewTopicProps {
  weekId: string;
  onCancel: () => void;
  onPost: (topic: NewTopicInput) => void | boolean | Promise<boolean | void>;
}

export default function LearnerNewTopic({ weekId, onCancel, onPost }: LearnerNewTopicProps) {
  const draftKey = `learner-topic-draft:${weekId}`;
  const [form, setForm] = useState<TopicDraft>(EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [editorKey, setEditorKey] = useState(0);
  const [posting, setPosting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toast = useToast();

  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY) || files.length > 0;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      setForm({ ...EMPTY, ...(JSON.parse(raw) as Partial<TopicDraft>) });
      setEditorKey((k) => k + 1);
    } catch {}
  }, [draftKey]);

  const set =
    <K extends keyof TopicDraft>(key: K) =>
    (value: TopicDraft[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
      if (key === "subject" || key === "message") setErrors((e) => ({ ...e, [key]: undefined }));
    };

  const saveDraft = () => {
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(form));
      toast.show(files.length ? "Draft saved (attachments are not kept in drafts)" : "Draft saved");
    } catch {
      toast.show("Could not save the draft");
    }
  };

  const cancel = () => {
    if (posting) return;
    if (dirty) {
      setConfirmOpen(true);
      return;
    }
    onCancel();
  };

  const post = async () => {
    if (posting) return;
    const next: Errors = {};
    if (!form.subject) next.subject = "Choose a subject";
    if (!plainText(form.message)) next.message = "Write a message before posting";
    setErrors(next);
    if (Object.keys(next).length) return;

    const title = SUBJECT_OPTIONS.find((o) => o.value === form.subject)?.label ?? form.subject;
    setPosting(true);
    try {
      const ok = await onPost({
        title,
        message: DOMPurify.sanitize(form.message, { USE_PROFILES: { html: true } }),
        group: form.group,
        subscribe: form.subscribe,
        notify: form.notify,
        files,
      });
      if (ok !== false) {
        try {
          window.localStorage.removeItem(draftKey);
        } catch {}
      }
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className={styles.view}>
      <button type="button" className={styles.back} onClick={cancel}>
        <ArrowLeft size={18} strokeWidth={1.75} aria-hidden />
        Topics
      </button>

      <section className={styles.card} aria-labelledby="new-topic-title">
        <h2 id="new-topic-title" className={styles.title}>
          New Topic
        </h2>

        <SelectField label="Subject" value={form.subject} options={SUBJECT_OPTIONS} onChange={set("subject")} error={errors.subject} />

        <div className={styles.message}>
          <EditorField key={`message-${editorKey}`} label="Message" value={form.message} onChange={set("message")} placeholder="Share your thoughts…" />
          {errors.message && (
            <p className={styles.error} role="alert">
              {errors.message}
            </p>
          )}
        </div>

        <div className={styles.grid}>
          <SelectField label="Group" value={form.group} options={FORM_GROUP_OPTIONS} onChange={set("group")} />
          <SwitchField label="Subscribe" text="Subscribe" checked={form.subscribe} onChange={set("subscribe")} />
          <SwitchField label="Notify" text="Notify me" checked={form.notify} onChange={set("notify")} />
        </div>
      </section>

      <AttachBox files={files} onChange={setFiles} />

      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={cancel} disabled={posting}>
          Cancel
        </button>
        <button type="button" className={styles.btn} onClick={saveDraft} disabled={posting}>
          Save Draft
        </button>
        <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={() => void post()} disabled={posting}>
          {posting ? (files.length ? "Uploading…" : "Posting…") : "Post"}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Discard this topic?"
        message="What you typed and any attached files will be lost."
        confirmLabel="Discard"
        onConfirm={() => {
          setConfirmOpen(false);
          onCancel();
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      <Toast message={toast.message} />
    </div>
  );
}