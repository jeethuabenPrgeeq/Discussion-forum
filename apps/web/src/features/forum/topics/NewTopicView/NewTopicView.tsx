'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import DOMPurify from 'dompurify';
import { ChevronDown } from 'lucide-react';
import AttachDropzone from '@/features/forum/topics/AttachDropzone/AttachDropzone';
import BackLink from '@/components/ui/BackLink';
import NeuDatePicker from '@/components/form/NeuDatePicker/NeuDatePicker';
import DropdownMenu from '@/components/ui/DropdownMenu';
import ConfirmDialog from '@/components/ui/ConfirmDialog/ConfirmDialog';
import RichTextEditor, { type RichTextEditorHandle } from '@/components/editor/RichTextEditor';
import Select from '@/components/form/Select';
import Toast, { useToast } from '@/components/toast/Toast';
import Toggle from '@/components/form/Toggle';
import { uploadFiles, type UploadedFile } from '@/features/forum/lib/api';
import { CURRENT_USER, GROUPS, WEEKS, getSubjectSuggestions } from '@/features/forum/lib/mock';
import { useForum } from '@/features/forum/lib/store';
import { FORUM_BASE, topicHref } from '@/features/forum/lib/routes';
import { ALL_GROUPS } from '@/features/forum/lib/utils';
import type { ForumTopic, TopicKind } from '@/features/forum/lib/types';
import styles from './NewTopicView.module.css';

type NotifyWhen = 'now' | 'digest' | 'off';

interface NewTopicForm {
  subject: string;
  group: string;
  kind: TopicKind;
  pinned: boolean;
  lockReplies: boolean;
  replyRequired: boolean;
  replyBy: string;
  graded: boolean;
  notify: NotifyWhen;
}

interface FormErrors {
  subject?: string;
  message?: string;
}

interface Option {
  value: string;
  label: string;
}

const TYPES: Option[] = [
  { value: 'discussion', label: 'Discussion' },
  { value: 'question', label: 'Question' },
  { value: 'notice', label: 'Notice' },
];

const NOTIFY: Option[] = [
  { value: 'now', label: 'Now' },
  { value: 'digest', label: 'Digest' },
  { value: 'off', label: 'Off' },
];

const draftKeyFor = (weekId: string) => `forum-new-topic-draft:${weekId}`;

const toAttachments = (files: UploadedFile[]) => files.map((f) => ({ id: f.id, name: f.name, size: f.size, url: f.url }));

function defaultForm(repliesDue: string): NewTopicForm {
  return {
    subject: '',
    group: ALL_GROUPS,
    kind: 'discussion',
    pinned: true,
    lockReplies: true,
    replyRequired: true,
    replyBy: repliesDue,
    graded: true,
    notify: 'now',
  };
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}

function SelectField({ id, label, value, options, onChange }: SelectFieldProps) {
  return (
    <div className={styles.field}>
      <span id={`${id}-label`} className={styles.label}>
        {label}
      </span>
      <Select id={id} variant="field" labelledBy={`${id}-label`} value={value} options={options} onChange={onChange} />
    </div>
  );
}

interface SwitchFieldProps {
  id: string;
  label: string;
  text: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

function SwitchField({ id, label, text, checked, disabled, onChange }: SwitchFieldProps) {
  return (
    <div className={styles.field}>
      <span id={`${id}-label`} className={styles.label}>
        {label}
      </span>
      <label className={styles.control} data-switch data-disabled={disabled || undefined}>
        <span className={styles.switchText}>{text}</span>
        <Toggle id={id} checked={checked} disabled={disabled} onChange={onChange} aria-describedby={`${id}-label`} />
      </label>
    </div>
  );
}

export default function NewTopicView() {
  const router = useRouter();
  const { weekId, addTopic, forumDetailFor } = useForum();
  const week = WEEKS.find((w) => w.id === weekId) ?? WEEKS[0];
  const forum = forumDetailFor(weekId);
  const suggestions = getSubjectSuggestions(week);
  const draftKey = draftKeyFor(weekId);
  const uid = useId();
  const fieldId = (name: string) => `${uid}-${name}`;

  const subjectRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const [form, setForm] = useState(() => defaultForm(forum.deadlines.repliesDue));
  const [files, setFiles] = useState<File[]>([]);
  const [messageEmpty, setMessageEmpty] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [posting, setPosting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toast = useToast();

  const isAnnouncement = form.kind === 'notice';
  const replyByEnabled = form.replyRequired && !isAnnouncement;
  const dirty = form.subject.trim() !== '' || !messageEmpty || files.length > 0;

  const update = <K extends keyof NewTopicForm>(key: K, value: NewTopicForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { form?: Partial<NewTopicForm>; html?: string };
      if (draft.form) setForm((f) => ({ ...f, ...draft.form }));
      if (draft.html) editorRef.current?.setHTML(draft.html);
    } catch {}
  }, [draftKey]);

  const setSubject = (value: string) => {
    update('subject', value);
    if (errors.subject) setErrors((e) => ({ ...e, subject: undefined }));
  };

  const saveDraft = () => {
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({ form, html: editorRef.current?.getHTML() ?? '' }));
      toast.show('Draft saved');
    } catch {
      toast.show('Could not save the draft');
    }
  };

  const cancel = () => {
    if (posting) return;
    if (dirty) {
      setConfirmOpen(true);
      return;
    }
    router.push(FORUM_BASE);
  };

  const submit = async () => {
    if (posting) return;
    const editor = editorRef.current;
    const html = editor && !editor.isEmpty() ? DOMPurify.sanitize(editor.getHTML(), { USE_PROFILES: { html: true } }) : '';
    const nextErrors: FormErrors = {
      subject: form.subject.trim() ? undefined : 'Add a subject for this topic',
      message: html ? undefined : 'Write a message to start the discussion',
    };
    setErrors(nextErrors);
    if (nextErrors.subject) {
      subjectRef.current?.focus();
      return;
    }
    if (nextErrors.message) {
      editor?.focus();
      return;
    }

    setPosting(true);
    let uploaded: UploadedFile[] = [];
    if (files.length) {
      try {
        uploaded = await uploadFiles(files);
      } catch (error) {
        toast.show(error instanceof Error ? error.message : 'Could not upload the files. Please try again.');
        setPosting(false);
        return;
      }
    }

    const now = new Date().toISOString();
    const topicId = `t-${crypto.randomUUID()}`;
    const topic: ForumTopic = {
      id: topicId,
      title: form.subject.trim(),
      createdBy: CURRENT_USER.name,
      replies: 0,
      lastActivityAt: now,
      createdAt: now,
      state: isAnnouncement ? 'notice' : 'open',
      isPinned: form.pinned,
      isLocked: false,
      participation: isAnnouncement ? null : form.replyRequired ? 'required' : 'optional',
      group: form.group === ALL_GROUPS ? '' : form.group,
      kind: form.kind,
      replyBy: replyByEnabled ? form.replyBy : undefined,
      lockAfterDue: form.lockReplies,
      isGraded: form.graded,
      isUnread: false,
      reportCount: 0,
    };

    addTopic(
      weekId,
      topic,
      {
        id: `p-${crypto.randomUUID()}`,
        topicId,
        author: CURRENT_USER,
        body: html,
        createdAt: now,
        isBestAnswer: false,
        isPrivate: false,
        attachments: toAttachments(uploaded),
      },
      uploaded.map((f) => f.id),
    );

    try {
      window.localStorage.removeItem(draftKey);
    } catch {}
    router.push(topicHref(topicId));
  };

  return (
    <div className={styles.view}>
      <div>
        <BackLink href={FORUM_BASE} label="Topics" />
      </div>

      <section className={styles.card} aria-labelledby={fieldId('title')}>
        <h2 id={fieldId('title')} className={styles.title}>
          New Topic
        </h2>

        <div className={styles.field}>
          <label htmlFor={fieldId('subject')} className={styles.label}>
            Subject
          </label>
          <div className={styles.control} data-invalid={errors.subject ? true : undefined}>
            <input
              ref={subjectRef}
              id={fieldId('subject')}
              type="text"
              value={form.subject}
              maxLength={120}
              placeholder="Select or type a subject"
              aria-invalid={!!errors.subject}
              aria-describedby={errors.subject ? fieldId('subject-error') : undefined}
              onChange={(e) => setSubject(e.target.value)}
            />
            <DropdownMenu
              label="Suggested subjects"
              trigger={<ChevronDown size={24} strokeWidth={1.25} />}
              triggerClassName={styles.iconTrigger}
              items={suggestions.map((s) => ({ key: s, label: s, onSelect: () => setSubject(s) }))}
            />
          </div>
          {errors.subject && (
            <p id={fieldId('subject-error')} className={styles.error}>
              {errors.subject}
            </p>
          )}
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Message</span>
          <div className={styles.editorWrap} data-invalid={errors.message ? true : undefined}>
            <RichTextEditor
              ref={editorRef}
              variant="inset"
              label="Message"
              placeholder="Write the prompt for this topic…"
              onEmptyChange={(empty) => {
                setMessageEmpty(empty);
                if (!empty && errors.message) setErrors((e) => ({ ...e, message: undefined }));
              }}
            />
          </div>
          {errors.message && <p className={styles.error}>{errors.message}</p>}
        </div>

        <div className={styles.grid}>
          <SelectField
            id={fieldId('group')}
            label="Group"
            value={form.group}
            options={[ALL_GROUPS, ...GROUPS].map((g) => ({ value: g, label: g }))}
            onChange={(v) => update('group', v)}
          />
          <SelectField id={fieldId('type')} label="Type" value={form.kind} options={TYPES} onChange={(v) => update('kind', v as TopicKind)} />
          <SwitchField id={fieldId('pin')} label="Pin to Top" text="Permission to Pin" checked={form.pinned} onChange={(v) => update('pinned', v)} />
          <SwitchField
            id={fieldId('lock')}
            label="Lock replies"
            text="Permission for Lock Reply"
            checked={form.lockReplies}
            onChange={(v) => update('lockReplies', v)}
          />
          <SwitchField
            id={fieldId('required')}
            label="Reply Required"
            text="Permission for Reply"
            checked={form.replyRequired && !isAnnouncement}
            disabled={isAnnouncement}
            onChange={(v) => update('replyRequired', v)}
          />
          <div className={styles.field}>
            <label htmlFor={fieldId('reply-by')} className={styles.label}>
              Reply by
            </label>
            <div className={styles.control} data-disabled={!replyByEnabled || undefined}>
              <NeuDatePicker id={fieldId('reply-by')} value={form.replyBy} min={new Date().toISOString().slice(0, 10)} disabled={!replyByEnabled} label="reply-by date" onChange={(v) => update('replyBy', v)} />
            </div>
          </div>
          <SwitchField id={fieldId('grade')} label="Grade it" text="Permission for Grading" checked={form.graded} onChange={(v) => update('graded', v)} />
          <SelectField id={fieldId('notify')} label="Notify" value={form.notify} options={NOTIFY} onChange={(v) => update('notify', v as NotifyWhen)} />
        </div>
      </section>

      <div className={styles.footer}>
        <AttachDropzone onChange={setFiles} />
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={cancel} disabled={posting}>
            Cancel
          </button>
          <button type="button" className={styles.btn} onClick={saveDraft} disabled={posting}>
            Save Draft
          </button>
          <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={() => void submit()} disabled={posting}>
            {posting ? (files.length ? 'Uploading…' : 'Posting…') : 'Post'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Discard this topic?"
        message="Unsaved changes and attached files will be lost."
        confirmLabel="Discard"
        onConfirm={() => {
          setConfirmOpen(false);
          router.push(FORUM_BASE);
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      <Toast message={toast.message} />
    </div>
  );
}