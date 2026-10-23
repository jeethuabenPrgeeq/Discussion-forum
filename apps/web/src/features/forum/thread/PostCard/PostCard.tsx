'use client';

import { useState, type FormEvent } from 'react';
import {
  CircleCheck,
  Forward,
  Link as LinkIcon,
  LockKeyhole,
  MessageCircleMore,
  Paperclip,
  Pencil,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import type { ForumPost } from '@/features/forum/lib/types';
import { initialsOf, timeAgo } from '@/features/forum/lib/utils';
import styles from './PostCard.module.css';

const ROLE_LABEL = { learner: 'Learner', instructor: 'Instructor', admin: 'Admin' } as const;

type Tone = 'reply' | 'link' | 'edit' | 'delete' | 'best' | 'private' | 'feedback';

interface ActionPillProps {
  tone: Tone;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  pressed?: boolean;
}

function ActionPill({ tone, label, icon: Icon, onClick, pressed }: ActionPillProps) {
  return (
    <button type="button" className={styles.pill} data-tone={tone} aria-pressed={pressed} onClick={onClick}>
      <span className={styles.pillIcon} aria-hidden="true">
        <Icon size={16} strokeWidth={1.5} />
      </span>
      {label}
    </button>
  );
}

interface PostCardProps {
  post: ForumPost;
  now: number;
  replyToName?: string;
  onReply: () => void;
  onCopyLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleBest: () => void;
  onPrivateReply: () => void;
  onSaveFeedback: (text: string) => void;
}

export default function PostCard({
  post,
  now,
  replyToName,
  onReply,
  onCopyLink,
  onEdit,
  onDelete,
  onToggleBest,
  onPrivateReply,
  onSaveFeedback,
}: PostCardProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [draft, setDraft] = useState(post.feedback ?? '');
  const authorId = `post-${post.id}-author`;

  const toggleFeedback = () => {
    setDraft(post.feedback ?? '');
    setFeedbackOpen((o) => !o);
  };

  const saveFeedback = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSaveFeedback(draft.trim());
    setFeedbackOpen(false);
  };

  return (
    <article id={`post-${post.id}`} className={styles.card} data-accent={post.author.accent} aria-labelledby={authorId}>
      <span className={styles.avatar} aria-hidden="true">
        {initialsOf(post.author.name)}
      </span>

      <div className={styles.main}>
        <header className={styles.meta}>
          <span id={authorId} className={styles.author}>
            {post.author.name}
          </span>
          <span className={styles.role}>{ROLE_LABEL[post.author.role]}</span>
          <time className={styles.time} dateTime={post.createdAt}>
            {timeAgo(post.createdAt, now)}
          </time>
          {post.editedAt && <span className={styles.flag}>Edited</span>}
          {post.isPrivate && (
            <span className={styles.flag} data-tone="private">
              <LockKeyhole size={12} aria-hidden />
              Private
            </span>
          )}
          {post.isBestAnswer && (
            <span className={styles.flag} data-tone="best">
              <CircleCheck size={12} aria-hidden />
              Best answer
            </span>
          )}
        </header>

        {replyToName && (
          <p className={styles.replyTo}>
            <Forward size={14} aria-hidden />
            Replying to {replyToName}
          </p>
        )}

        <div className={styles.body} dangerouslySetInnerHTML={{ __html: post.body }} />

        {post.attachments.length > 0 && (
          <ul className={styles.files} aria-label="Attachments">
            {post.attachments.map((f) => (
              <li key={f.name} className={styles.file}>
                <Paperclip size={14} aria-hidden />
                {f.name}
              </li>
            ))}
          </ul>
        )}

        {post.feedback && !feedbackOpen && (
          <div className={styles.feedbackNote}>
            <strong>Feedback</strong>
            <p>{post.feedback}</p>
          </div>
        )}

        {feedbackOpen && (
          <form className={styles.feedbackForm} onSubmit={saveFeedback}>
            <label htmlFor={`${authorId}-feedback`} className={styles.feedbackLabel}>
              Feedback for {post.author.name}
            </label>
            <textarea
              id={`${authorId}-feedback`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Visible to the author and instructors"
            />
            <div className={styles.feedbackActions}>
              <button type="button" className={styles.ghost} onClick={() => setFeedbackOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.save} disabled={!draft.trim()}>
                Save feedback
              </button>
            </div>
          </form>
        )}
      </div>

      <div className={styles.actions}>
        <ActionPill tone="reply" label="Reply" icon={Forward} onClick={onReply} />
        <ActionPill tone="link" label="Link" icon={LinkIcon} onClick={onCopyLink} />
        <ActionPill tone="edit" label="Edit" icon={Pencil} onClick={onEdit} />
        <ActionPill tone="delete" label="Delete" icon={Trash2} onClick={onDelete} />
        <ActionPill tone="best" label="Best Answer" icon={CircleCheck} pressed={post.isBestAnswer} onClick={onToggleBest} />
        <ActionPill tone="private" label="Private Reply" icon={LockKeyhole} onClick={onPrivateReply} />
        <ActionPill tone="feedback" label="Feedback" icon={MessageCircleMore} pressed={feedbackOpen} onClick={toggleFeedback} />
      </div>
    </article>
  );
}