'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThreadToolbar from '@/features/forum/thread/ThreadToolbar/ThreadToolbar';
import PostCard from '@/features/forum/thread/PostCard/PostCard';
import ReplyComposer, { type ComposerHandle, type ComposerMode, type ComposerPayload } from '@/features/forum/thread/ReplyComposer/ReplyComposer';
import { CURRENT_USER } from '@/features/forum/lib/mock';
import { FORUM_BASE } from '@/features/forum/lib/routes';
import { useForum } from '@/features/forum/lib/store';
import { STATUS_LABEL, statusOf } from '@/features/forum/lib/utils';
import type { ForumPost } from '@/features/forum/lib/types';
import styles from './ThreadView.module.css';

export default function ThreadView({ topicId }: { topicId: string }) {
  const router = useRouter();
  const forum = useForum();
  const { weekId, setWeekId } = forum;
  const found = forum.findTopic(topicId);
  const foundWeekId = found?.weekId;
  const posts = forum.postsFor(topicId);
  const composerRef = useRef<ComposerHandle>(null);
  const syncedRef = useRef<string | null>(null);
  const [mode, setMode] = useState<ComposerMode>({ type: 'reply' });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!foundWeekId || syncedRef.current === topicId) return;
    syncedRef.current = topicId;
    if (foundWeekId !== weekId) setWeekId(foundWeekId);
  }, [topicId, foundWeekId, weekId, setWeekId]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(id);
  }, [toast]);

  if (!found) {
    return (
      <div className={styles.empty}>
        <p>This topic doesn&apos;t exist or has been deleted.</p>
        <Link href={FORUM_BASE} className={styles.emptyLink}>
          Back to topics
        </Link>
      </div>
    );
  }

  const { topic } = found;
  const status = statusOf(topic);
  const postsById = new Map(posts.map((p) => [p.id, p]));

  const compose = (next: ComposerMode) => {
    setMode(next);
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const copyLink = async (post: ForumPost) => {
    const url = `${window.location.origin}${window.location.pathname}#post-${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast('Link copied');
    } catch {
      setToast('Could not copy the link');
    }
  };

  const removePost = (post: ForumPost) => {
    if (!window.confirm(`Delete this post by ${post.author.name}?`)) return;
    forum.deletePost(topicId, post.id);
    const affected = mode.type === 'edit' ? mode.post.id === post.id : mode.target?.id === post.id;
    if (affected) setMode({ type: 'reply' });
  };

  const removeTopic = () => {
    if (!window.confirm(`Delete "${topic.title}" and all its posts?`)) return;
    router.push(FORUM_BASE);
    forum.deleteTopic(topicId);
  };

  const submit = ({ html, attachments, notify }: ComposerPayload) => {
    if (mode.type === 'edit') {
      forum.updatePost(topicId, mode.post.id, { body: html, editedAt: new Date().toISOString() });
      setToast('Post updated');
    } else {
      forum.addPost({
        id: `p-${crypto.randomUUID()}`,
        topicId,
        author: CURRENT_USER,
        body: html,
        createdAt: new Date().toISOString(),
        isBestAnswer: false,
        isPrivate: mode.type === 'private',
        replyToId: mode.target?.id,
        attachments,
      });
      setToast(notify ? 'Reply posted. You’ll be notified of responses.' : 'Reply posted');
    }
    setMode({ type: 'reply' });
  };

  return (
    <div className={styles.view}>
      <ThreadToolbar
        backHref={FORUM_BASE}
        topic={topic}
        onTogglePin={() => forum.updateTopic(topicId, { isPinned: !topic.isPinned })}
        onToggleLock={() => forum.updateTopic(topicId, { isLocked: !topic.isLocked })}
        onDeleteTopic={removeTopic}
        onGrade={() => setToast('Grading lives in the Grades tab, which is up next')}
      />

      <section className={styles.thread} aria-labelledby="thread-title">
        <header className={styles.titleRow}>
          <h2 id="thread-title" className={styles.title}>
            {topic.title}
          </h2>
          <span className={styles.status} data-status={status}>
            {STATUS_LABEL[status]}
          </span>
        </header>

        <ol className={styles.posts}>
          {posts.map((p) => (
            <li key={p.id}>
              <PostCard
                post={p}
                now={forum.now}
                replyToName={p.replyToId ? postsById.get(p.replyToId)?.author.name : undefined}
                onReply={() => compose({ type: 'reply', target: p })}
                onCopyLink={() => copyLink(p)}
                onEdit={() => compose({ type: 'edit', post: p })}
                onDelete={() => removePost(p)}
                onToggleBest={() => forum.setBestAnswer(topicId, p.isBestAnswer ? null : p.id)}
                onPrivateReply={() => compose({ type: 'private', target: p })}
                onSaveFeedback={(text) => {
                  forum.updatePost(topicId, p.id, { feedback: text });
                  setToast('Feedback saved');
                }}
              />
            </li>
          ))}
        </ol>
      </section>

      <ReplyComposer
        ref={composerRef}
        key={mode.type === 'edit' ? `edit-${mode.post.id}` : 'compose'}
        mode={mode}
        topicId={topicId}
        locked={topic.isLocked && mode.type !== 'edit'}
        onCancel={() => setMode({ type: 'reply' })}
        onSubmit={submit}
        onToast={setToast}
      />

      <div className={styles.toast} role="status" aria-live="polite" data-visible={toast ? true : undefined}>
        {toast}
      </div>
    </div>
  );
}