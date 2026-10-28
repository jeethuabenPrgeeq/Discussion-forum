'use client';

import { useRef, useState, type Ref } from 'react';
import {
  CircleCheck,
  Flag,
  Forward,
  Link as LinkIcon,
  LockKeyhole,
  MessageCircleMore,
  Paperclip,
  Pencil,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import LinkPanel from '@/features/forum/thread/LinkPanel/LinkPanel';
import InlineReply from '@/features/forum/thread/InlineReply/InlineReply';
import EditPanel, { type PostEdit } from '@/features/forum/thread/EditPanel/EditPanel';
import BestAnswerPanel, { type BestAnswerChoice } from '@/features/forum/thread/BestAnswerPanel/BestAnswerPanel';
import PrivateReplyPanel, { type PrivateReplyPayload } from '@/features/forum/thread/PrivateReplyPanel/PrivateReplyPanel';
import FeedbackPanel, { FEEDBACK_RATING_LABEL } from '@/features/forum/thread/FeedbackPanel/FeedbackPanel';
import ReportPanel, { type PostReport } from '@/features/forum/thread/ReportPanel/ReportPanel';
import { fileUrl } from '@/features/forum/lib/api';
import type { ForumAttachment, ForumPost, PostFeedback } from '@/features/forum/lib/types';
import { initialsOf, timeAgo } from '@/features/forum/lib/utils';
import styles from './PostCard.module.css';

const ROLE_LABEL = { learner: 'Learner', instructor: 'Instructor', admin: 'Admin' } as const;

type Tone = 'reply' | 'link' | 'edit' | 'delete' | 'best' | 'private' | 'feedback' | 'report';
type Panel = 'reply' | 'link' | 'edit' | 'best' | 'private' | 'feedback' | 'report' | null;
type PostFile = ForumAttachment & { id?: string; url?: string };

interface ActionPillProps {
  ref?: Ref<HTMLButtonElement>;
  tone: Tone;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  pressed?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  title?: string;
}

function ActionPill({ ref, tone, label, icon: Icon, onClick, pressed, expanded, disabled, title }: ActionPillProps) {
  return (
    <button
      ref={ref}
      type="button"
      className={styles.pill}
      data-tone={tone}
      aria-pressed={pressed}
      aria-expanded={expanded}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      <span className={styles.pillIcon} aria-hidden="true">
        <Icon size={16} strokeWidth={1.5} />
      </span>
      {label}
    </button>
  );
}

function editTagFor(post: ForumPost) {
  if (!post.editedAt || post.hideEditTag) return null;
  return post.editedBy && post.editedBy !== 'learner' ? 'Edited by instructor' : 'Edited';
}

function feedbackHeading(detail?: PostFeedback) {
  if (!detail) return 'Feedback';
  const parts = ['Feedback', FEEDBACK_RATING_LABEL[detail.rating]];
  if (detail.marks !== null) parts.push(`${detail.criterion} ${detail.marks}/${detail.max}`);
  return parts.join(' · ');
}

interface PostCardProps {
  post: ForumPost;
  now: number;
  replyToName?: string;
  viewer?: boolean;
  showFeedback?: boolean;
  hideReply?: boolean;
  replyLocked?: boolean;
  replyLockedReason?: string;
  editLocked?: boolean;
  reported?: boolean;
  onSendReply: (html: string) => void;
  onLinkCopied: (message: string) => void;
  onSaveEdit?: (edit: PostEdit) => void;
  onEditBlocked?: () => void;
  onReport?: (report: PostReport) => void;
  onReportBlocked?: () => void;
  onDelete?: () => void;
  onConfirmBest?: (choice: BestAnswerChoice) => void;
  onRemoveBest?: () => void;
  onSendPrivate?: (payload: PrivateReplyPayload) => void;
  onSaveFeedback?: (feedback: PostFeedback) => void;
}

export default function PostCard({
  post,
  now,
  replyToName,
  viewer = false,
  showFeedback = true,
  hideReply = false,
  replyLocked = false,
  replyLockedReason = 'This topic is locked',
  editLocked = false,
  reported = false,
  onSendReply,
  onLinkCopied,
  onSaveEdit,
  onEditBlocked,
  onReport,
  onReportBlocked,
  onDelete,
  onConfirmBest,
  onRemoveBest,
  onSendPrivate,
  onSaveFeedback,
}: PostCardProps) {
  const [panel, setPanel] = useState<Panel>(null);
  const replyBtnRef = useRef<HTMLButtonElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);
  const editBtnRef = useRef<HTMLButtonElement>(null);
  const reportBtnRef = useRef<HTMLButtonElement>(null);
  const bestBtnRef = useRef<HTMLButtonElement>(null);
  const privateBtnRef = useRef<HTMLButtonElement>(null);
  const feedbackBtnRef = useRef<HTMLButtonElement>(null);
  const authorId = `post-${post.id}-author`;
  const showEdit = !!onSaveEdit || !!onEditBlocked;
  const showReport = !!onReport || !!onReportBlocked;
  const replyOpen = panel === 'reply' && !replyLocked && !hideReply;
  const linkOpen = panel === 'link';
  const editOpen = panel === 'edit' && !!onSaveEdit && !editLocked;
  const reportOpen = panel === 'report' && !!onReport && !reported;
  const bestOpen = panel === 'best' && !viewer && !!onConfirmBest && !post.isBestAnswer;
  const privateOpen = panel === 'private' && !viewer && !!onSendPrivate;
  const feedbackOpen = panel === 'feedback' && !viewer && !!onSaveFeedback;
  const editTag = editTagFor(post);
  const detail = post.feedbackDetail;
  const hasFeedback = !!post.feedback || !!detail;
  const feedbackHidden = detail?.visible === false;
  const showFeedbackNote = showFeedback && hasFeedback && !feedbackOpen && !(viewer && feedbackHidden);
  const files = (post.attachments ?? []) as PostFile[];

  const buttonFor = (p: Panel) => {
    switch (p) {
      case 'reply':
        return replyBtnRef.current;
      case 'edit':
        return editBtnRef.current;
      case 'report':
        return reportBtnRef.current;
      case 'best':
        return bestBtnRef.current;
      case 'private':
        return privateBtnRef.current;
      case 'feedback':
        return feedbackBtnRef.current;
      default:
        return linkBtnRef.current;
    }
  };

  const togglePanel = (next: Exclude<Panel, null>) => setPanel((current) => (current === next ? null : next));

  const finish = (p: Panel) => {
    const btn = buttonFor(p);
    setPanel(null);
    btn?.focus();
  };

  const closePanel = () => finish(panel);

  const handleEditClick = () => {
    if (onEditBlocked) {
      onEditBlocked();
      return;
    }
    togglePanel('edit');
  };

  const handleReportClick = () => {
    if (onReportBlocked) {
      onReportBlocked();
      return;
    }
    togglePanel('report');
  };

  const sendReply = (html: string) => {
    onSendReply(html);
    finish('reply');
  };

  const saveEdit = (edit: PostEdit) => {
    onSaveEdit?.(edit);
    finish('edit');
  };

  const submitReport = (report: PostReport) => {
    onReport?.(report);
    setPanel(null);
    linkBtnRef.current?.focus();
  };

  const confirmBest = (choice: BestAnswerChoice) => {
    onConfirmBest?.(choice);
    finish('best');
  };

  const sendPrivate = (payload: PrivateReplyPayload) => {
    onSendPrivate?.(payload);
    finish('private');
  };

  const saveFeedback = (feedback: PostFeedback) => {
    onSaveFeedback?.(feedback);
    finish('feedback');
  };

  const handleBestClick = () => {
    if (post.isBestAnswer) {
      onRemoveBest?.();
      setPanel(null);
      return;
    }
    togglePanel('best');
  };

  return (
    <article
      id={`post-${post.id}`}
      className={styles.card}
      data-accent={post.author.accent}
      data-best={post.isBestAnswer || undefined}
      aria-labelledby={authorId}
    >
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
          {editTag && (
            <span className={styles.flag} title={post.editReason ? `Reason: ${post.editReason}` : undefined}>
              {editTag}
            </span>
          )}
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
              {post.bonusMarks ? ` · +${post.bonusMarks}` : ''}
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

        {files.length > 0 && (
          <ul className={styles.files} aria-label="Attachments">
            {files.map((f, i) => (
              <li key={f.id ?? `${f.name}-${i}`} className={styles.file}>
                {f.url ? (
                  <a className={styles.fileLink} href={fileUrl(f.url)} target="_blank" rel="noopener noreferrer" title={`Open ${f.name}`}>
                    <Paperclip size={14} aria-hidden />
                    {f.name}
                  </a>
                ) : (
                  <>
                    <Paperclip size={14} aria-hidden />
                    {f.name}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {showFeedbackNote && (
          <div className={styles.feedbackNote}>
            <strong>{feedbackHeading(detail)}</strong>
            {post.feedback && <p>{post.feedback}</p>}
            {!viewer && feedbackHidden && <span className={styles.feedbackHidden}>Hidden from learner</span>}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {!hideReply && (
          <ActionPill
            ref={replyBtnRef}
            tone="reply"
            label="Reply"
            icon={Forward}
            pressed={replyOpen}
            expanded={replyOpen}
            disabled={replyLocked}
            title={replyLocked ? replyLockedReason : undefined}
            onClick={() => togglePanel('reply')}
          />
        )}
        <ActionPill ref={linkBtnRef} tone="link" label="Link" icon={LinkIcon} pressed={linkOpen} expanded={linkOpen} onClick={() => togglePanel('link')} />
        {showEdit && (
          <ActionPill
            ref={editBtnRef}
            tone="edit"
            label="Edit"
            icon={Pencil}
            pressed={editOpen}
            expanded={onEditBlocked ? undefined : editOpen}
            disabled={editLocked}
            title={editLocked ? 'This topic is locked' : undefined}
            onClick={handleEditClick}
          />
        )}
        {showReport && (
          <ActionPill
            ref={reportBtnRef}
            tone="report"
            label={reported ? 'Reported' : 'Report'}
            icon={Flag}
            pressed={reportOpen}
            expanded={onReportBlocked || reported ? undefined : reportOpen}
            disabled={reported}
            title={reported ? 'You already reported this post' : undefined}
            onClick={handleReportClick}
          />
        )}
        {!viewer && onDelete && <ActionPill tone="delete" label="Delete" icon={Trash2} onClick={onDelete} />}
        {!viewer && onConfirmBest && (
          <ActionPill
            ref={bestBtnRef}
            tone="best"
            label="Best Answer"
            icon={CircleCheck}
            pressed={post.isBestAnswer || bestOpen}
            expanded={post.isBestAnswer ? undefined : bestOpen}
            title={post.isBestAnswer ? 'Remove best answer' : undefined}
            onClick={handleBestClick}
          />
        )}
        {!viewer && onSendPrivate && (
          <ActionPill
            ref={privateBtnRef}
            tone="private"
            label="Private Reply"
            icon={LockKeyhole}
            pressed={privateOpen}
            expanded={privateOpen}
            onClick={() => togglePanel('private')}
          />
        )}
        {!viewer && onSaveFeedback && (
          <ActionPill
            ref={feedbackBtnRef}
            tone="feedback"
            label="Feedback"
            icon={MessageCircleMore}
            pressed={feedbackOpen}
            expanded={feedbackOpen}
            onClick={() => togglePanel('feedback')}
          />
        )}
      </div>

      {replyOpen && <InlineReply authorName={post.author.name} onSend={sendReply} onClose={closePanel} />}

      {linkOpen && <LinkPanel topicId={post.topicId} postId={post.id} viewer={viewer} onCopied={onLinkCopied} onClose={closePanel} />}

      {editOpen && <EditPanel post={post} simple={viewer} onSave={saveEdit} onCancel={closePanel} />}

      {reportOpen && <ReportPanel authorName={post.author.name} onSubmit={submitReport} onCancel={closePanel} />}

      {bestOpen && <BestAnswerPanel authorName={post.author.name} onConfirm={confirmBest} onCancel={closePanel} />}

      {privateOpen && <PrivateReplyPanel recipientName={post.author.name} onSend={sendPrivate} onCancel={closePanel} />}

      {feedbackOpen && <FeedbackPanel post={post} onSave={saveFeedback} onCancel={closePanel} />}
    </article>
  );
}