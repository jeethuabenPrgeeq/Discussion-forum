'use client';

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import DOMPurify from 'dompurify';
import { Check, X } from 'lucide-react';
import RichTextEditor, { type RichTextEditorHandle } from '@/components/editor/RichTextEditor';
import AttachDropzone from '@/features/forum/topics/AttachDropzone/AttachDropzone';
import type { ForumAttachment, ForumPost } from '@/features/forum/lib/types';
import styles from './ReplyComposer.module.css';

export type ComposerMode =
  | { type: 'reply'; target?: ForumPost }
  | { type: 'private'; target: ForumPost }
  | { type: 'edit'; post: ForumPost };

export interface ComposerHandle {
  focus: () => void;
}

export interface ComposerPayload {
  html: string;
  attachments: ForumAttachment[];
  files: File[];
  notify: boolean;
}

interface ReplyComposerProps {
  ref?: Ref<ComposerHandle>;
  mode: ComposerMode;
  topicId: string;
  locked: boolean;
  viewer?: boolean;
  onCancel: () => void;
  onSubmit: (payload: ComposerPayload) => void | boolean | Promise<boolean | void>;
  onToast: (message: string) => void;
}

const draftKey = (topicId: string) => `forum-draft:${topicId}`;

function bannerFor(mode: ComposerMode) {
  if (mode.type === 'edit') return `Editing ${mode.post.author.name}'s post`;
  if (mode.type === 'private') return `Private reply to ${mode.target.author.name}, visible only to them and instructors`;
  return mode.target ? `Replying to ${mode.target.author.name}` : null;
}

export default function ReplyComposer({ ref, mode, topicId, locked, viewer = false, onCancel, onSubmit, onToast }: ReplyComposerProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [attachKey, setAttachKey] = useState(0);
  const [notify, setNotify] = useState(true);
  const [empty, setEmpty] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = mode.type === 'edit';
  const editBody = mode.type === 'edit' ? mode.post.body : null;
  const banner = bannerFor(mode);

  useImperativeHandle(ref, () => ({
    focus: () => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      editorRef.current?.focus();
    },
  }));

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editBody !== null) {
      editor.setHTML(editBody);
      return;
    }
    try {
      const saved = window.localStorage.getItem(draftKey(topicId));
      if (saved) editor.setHTML(saved);
    } catch {}
  }, [editBody, topicId]);

  const submit = async () => {
    const editor = editorRef.current;
    if (!editor || editor.isEmpty() || submitting) return;
    const html = DOMPurify.sanitize(editor.getHTML(), { USE_PROFILES: { html: true } });
    setSubmitting(true);
    try {
      const ok = await onSubmit({ html, attachments: files.map((f) => ({ name: f.name, size: f.size })), files, notify });
      if (ok === false) return;
      editor.clear();
      setFiles([]);
      setAttachKey((k) => k + 1);
      if (!isEdit) {
        try {
          window.localStorage.removeItem(draftKey(topicId));
        } catch {}
      }
    } finally {
      setSubmitting(false);
    }
  };

  const saveDraft = () => {
    try {
      window.localStorage.setItem(draftKey(topicId), editorRef.current?.getHTML() ?? '');
      onToast('Draft saved');
    } catch {
      onToast('Could not save the draft');
    }
  };

  const submitLabel = submitting ? (files.length ? 'Uploading…' : 'Posting…') : isEdit ? 'Update' : 'Post';

  return (
    <section ref={sectionRef} id="reply" className={styles.composer} aria-labelledby="composer-title">
      <h3 id="composer-title" className={styles.heading}>
        {isEdit ? 'Edit Post' : 'Your Reply'}
      </h3>

      {banner && (
        <div className={styles.banner} data-tone={mode.type}>
          <span>{banner}</span>
          <button type="button" onClick={onCancel} aria-label="Cancel">
            <X size={16} />
          </button>
        </div>
      )}

      {locked ? (
        <p className={styles.locked}>
          {viewer ? "This topic is locked. You can read the discussion but can't reply." : 'This topic is locked. Unlock it from Actions to allow new replies.'}
        </p>
      ) : (
        <>
          <RichTextEditor
            ref={editorRef}
            label={isEdit ? 'Edit post' : 'Your reply'}
            placeholder="Say something sharp......"
            onEmptyChange={setEmpty}
            onSubmitShortcut={() => void submit()}
          />

          <div className={styles.footer}>
            <div className={styles.left}>
              {!isEdit && <AttachDropzone key={attachKey} compact onChange={setFiles} />}
              <label className={styles.notify}>
                <input type="checkbox" className={styles.checkInput} checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                <span className={styles.checkBox} aria-hidden="true">
                  <span className={styles.checkMark}>
                    <Check size={12} strokeWidth={3} />
                  </span>
                </span>
                Notify me
              </label>
            </div>

            <div className={styles.right}>
              {isEdit ? (
                <button type="button" className={styles.secondary} onClick={onCancel} disabled={submitting}>
                  Cancel
                </button>
              ) : (
                <button type="button" className={styles.secondary} onClick={saveDraft} disabled={submitting}>
                  Save Draft
                </button>
              )}
              <button type="button" className={styles.primary} onClick={() => void submit()} disabled={empty || submitting}>
                {submitLabel}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}