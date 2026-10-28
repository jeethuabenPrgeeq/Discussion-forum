"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleCheck, LockKeyhole, Megaphone, MessageCircle, Pin, type LucideIcon } from "lucide-react";
import Toast, { useToast } from "@/components/toast/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { OPEN_TAB_EVENT } from "@/components/notifications/NotificationBell";
import ThreadToolbar from "@/features/forum/thread/ThreadToolbar/ThreadToolbar";
import PostCard from "@/features/forum/thread/PostCard/PostCard";
import ReplyComposer, { type ComposerHandle, type ComposerMode, type ComposerPayload } from "@/features/forum/thread/ReplyComposer/ReplyComposer";
import type { PostEdit } from "@/features/forum/thread/EditPanel/EditPanel";
import type { BestAnswerChoice } from "@/features/forum/thread/BestAnswerPanel/BestAnswerPanel";
import type { PrivateReplyPayload } from "@/features/forum/thread/PrivateReplyPanel/PrivateReplyPanel";
import type { PostReport } from "@/features/forum/thread/ReportPanel/ReportPanel";
import { uploadFiles, type UploadedFile } from "@/features/forum/lib/api";
import { CURRENT_USER } from "@/features/forum/lib/mock";
import { FORUM_BASE } from "@/features/forum/lib/routes";
import { useForum } from "@/features/forum/lib/store";
import { STATUS_LABEL } from "@/features/forum/lib/utils";
import { ROLE_HOME, readSessionUser, type SessionUser } from "@/features/auth/lib/session";
import type { ForumAuthor, ForumPost, ForumTopic, PostFeedback, TopicStatus } from "@/features/forum/lib/types";
import styles from "./ThreadView.module.css";

interface ThreadViewProps {
  topicId: string;
  viewer?: boolean;
}

type PendingDelete = { kind: "post"; post: ForumPost } | { kind: "topic" } | null;

const DEFAULT_REQUIRED_REPLIES = 2;

const BADGE_ICON: Record<TopicStatus, LucideIcon> = {
  pinned: Pin,
  locked: LockKeyhole,
  answered: CircleCheck,
  notice: Megaphone,
  open: MessageCircle,
};

function badgesFor(topic: ForumTopic): TopicStatus[] {
  const list: TopicStatus[] = [];
  if (topic.isPinned) list.push("pinned");
  if (topic.isLocked) list.push("locked");
  if (topic.state !== "open") list.push(topic.state);
  return list.length > 0 ? list : ["open"];
}

const nameKey = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");

const shortName = (fullName: string) => {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last.charAt(0).toUpperCase()}` : first;
};

function learnerAuthor(user: SessionUser | null): ForumAuthor {
  if (!user) return { id: "u-learner", name: "Learner", role: "learner", accent: "red" };
  return { id: user.id, name: shortName(user.name), role: "learner", accent: "red" };
}

const toAttachments = (files: UploadedFile[]) =>
  files.map((f) => ({ id: f.id, name: f.name, size: f.size, url: f.url }));

export default function ThreadView({ topicId, viewer = false }: ThreadViewProps) {
  const router = useRouter();
  const forum = useForum();
  const toast = useToast();
  const { weekId, setWeekId } = forum;
  const found = forum.findTopic(topicId);
  const foundWeekId = found?.weekId;
  const allPosts = forum.postsFor(topicId);
  const composerRef = useRef<ComposerHandle>(null);
  const syncedRef = useRef<string | null>(null);
  const [mode, setMode] = useState<ComposerMode>({ type: "reply" });
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const backHref = viewer ? ROLE_HOME.learner : FORUM_BASE;
  const notify = (message: string) => toast.show(message);

  useEffect(() => {
    setSessionUser(readSessionUser());
  }, []);

  useEffect(() => {
    void forum.loadPosts(topicId);
  }, [forum.loadPosts, topicId]);

  useEffect(() => {
    if (!foundWeekId || syncedRef.current === topicId) return;
    syncedRef.current = topicId;
    if (foundWeekId !== weekId) setWeekId(foundWeekId);
  }, [topicId, foundWeekId, weekId, setWeekId]);

  if (!found) {
    if (!forum.ready) {
      return (
        <div className={styles.empty}>
          <p>Loading topic…</p>
        </div>
      );
    }
    return (
      <div className={styles.empty}>
        <p>This topic doesn&apos;t exist or has been deleted.</p>
        <Link href={backHref} className={styles.emptyLink}>
          Back to topics
        </Link>
      </div>
    );
  }

  const { topic } = found;
  const badges = badgesFor(topic);
  const isNotice = topic.state === "notice";
  const viewerReadOnly = viewer && isNotice;
  const postsById = new Map(allPosts.map((p) => [p.id, p]));
  const me = viewer ? learnerAuthor(sessionUser) : CURRENT_USER;
  const myId = sessionUser?.id ?? me.id;
  const isMine = (post: ForumPost) => post.author.id === myId || nameKey(post.author.name) === nameKey(me.name);
  const currentAuthor = () => (viewer ? learnerAuthor(readSessionUser()) : CURRENT_USER);

  const requiredReplies = Number.parseInt(String(forum.settingsFor(found.weekId)?.repliesEach ?? ""), 10) || DEFAULT_REQUIRED_REPLIES;
  const openingPostId = allPosts[0]?.id;
  const myReplies = allPosts.filter((p) => p.id !== openingPostId && isMine(p)).length;
  const repliesDone = myReplies >= requiredReplies;

  const visiblePosts = viewer
    ? allPosts.filter((p) => {
        if (!p.isPrivate) return true;
        const target = p.replyToId ? postsById.get(p.replyToId) : undefined;
        return isMine(p) || (target ? isMine(target) : false);
      })
    : allPosts;

  const posts = [...visiblePosts].sort((a, b) => Number(b.isBestAnswer) - Number(a.isBestAnswer));

  const replyBlocked = (post: ForumPost) => viewer && post.isPrivate && post.allowReplyBack === false;

  const openGrades = () => {
    router.push(`${FORUM_BASE}?tab=grades`);
    window.dispatchEvent(new CustomEvent(OPEN_TAB_EVENT, { detail: "grades" }));
  };

  const sendReply = (target: ForumPost, html: string) => {
    forum.addPost({
      id: `p-${crypto.randomUUID()}`,
      topicId,
      author: currentAuthor(),
      body: html,
      createdAt: new Date().toISOString(),
      isBestAnswer: false,
      isPrivate: target.isPrivate,
      replyToId: target.id,
      attachments: [],
    });
    notify(target.isPrivate ? "Private reply sent successfully" : "Reply posted successfully");
  };

  const sendPrivate = (target: ForumPost, payload: PrivateReplyPayload) => {
    forum.addPost({
      id: `p-${crypto.randomUUID()}`,
      topicId,
      author: CURRENT_USER,
      body: payload.html,
      createdAt: new Date().toISOString(),
      isBestAnswer: false,
      isPrivate: true,
      allowReplyBack: payload.allowReplyBack,
      replyToId: target.id,
      attachments: [],
    });
    notify(payload.emailCopy ? `Private reply sent successfully. ${target.author.name} will also get an email.` : "Private reply sent successfully");
  };

  const saveEdit = (post: ForumPost, edit: PostEdit) => {
    forum.updatePost(topicId, post.id, {
      body: edit.html,
      editedAt: new Date().toISOString(),
      editedBy: CURRENT_USER.role,
      editReason: edit.reason,
      hideEditTag: !edit.showTag,
    });
    notify(edit.notify ? `Changes saved successfully. ${post.author.name} will be notified.` : "Changes saved successfully");
  };

  const saveOwnEdit = (post: ForumPost, edit: PostEdit) => {
    forum.updatePost(topicId, post.id, {
      body: edit.html,
      editedAt: new Date().toISOString(),
      editedBy: "learner",
      hideEditTag: false,
    });
    notify("Your post was updated successfully");
  };

  const reportPost = (post: ForumPost, report: PostReport) => {
    forum.reportPost(topicId, post.id, report.reason, report.details, myId);
    notify(`Report sent (${report.reason}). An instructor will review it.`);
  };

  const saveFeedback = (post: ForumPost, feedback: PostFeedback) => {
    forum.updatePost(topicId, post.id, {
      feedback: feedback.note || undefined,
      feedbackDetail: feedback,
    });
    notify(feedback.visible ? `Feedback saved successfully and shared with ${post.author.name}` : "Feedback saved successfully. Hidden from the learner for now.");
  };

  const confirmBest = (post: ForumPost, choice: BestAnswerChoice) => {
    allPosts.filter((p) => p.isBestAnswer && p.id !== post.id && p.bonusMarks).forEach((p) => forum.updatePost(topicId, p.id, { bonusMarks: undefined }));
    forum.setBestAnswer(topicId, post.id);
    forum.updatePost(topicId, post.id, { bonusMarks: choice.bonus || undefined });
    if (choice.markAnswered) forum.updateTopic(topicId, { state: "answered" });
    notify(`Marked as best answer successfully. ${post.author.name} will be notified.`);
  };

  const removeBest = (post: ForumPost) => {
    forum.setBestAnswer(topicId, null);
    forum.updatePost(topicId, post.id, { bonusMarks: undefined });
    if (topic.state === "answered") forum.updateTopic(topicId, { state: "open" });
    notify("Best answer removed successfully");
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "topic") {
      setPendingDelete(null);
      void forum.deleteTopic(topicId).then(() => router.push(backHref));
      return;
    }
    const { post } = pendingDelete;
    forum.deletePost(topicId, post.id);
    const affected = mode.type === "edit" ? mode.post.id === post.id : mode.target?.id === post.id;
    if (affected) setMode({ type: "reply" });
    setPendingDelete(null);
    notify("Post deleted successfully");
  };

  const dialogCopy =
    pendingDelete?.kind === "topic"
      ? { title: "Delete this topic?", message: `"${topic.title}" and all its posts will be deleted. This can't be undone.` }
      : {
          title: "Delete this post?",
          message: pendingDelete ? `This removes ${pendingDelete.post.author.name}'s post from the topic. This can't be undone.` : "",
        };

  const submit = async ({ html, files, notify: notifyMe }: ComposerPayload) => {
    if (mode.type === "edit") {
      forum.updatePost(topicId, mode.post.id, { body: html, editedAt: new Date().toISOString() });
      notify("Post updated successfully");
      setMode({ type: "reply" });
      return true;
    }

    let uploaded: UploadedFile[] = [];
    if (files.length) {
      try {
        uploaded = await uploadFiles(files);
      } catch (error) {
        notify(error instanceof Error ? error.message : "Could not upload the files. Please try again.");
        return false;
      }
    }

    forum.addPost(
      {
        id: `p-${crypto.randomUUID()}`,
        topicId,
        author: currentAuthor(),
        body: html,
        createdAt: new Date().toISOString(),
        isBestAnswer: false,
        isPrivate: mode.type === "private",
        replyToId: mode.target?.id,
        attachments: toAttachments(uploaded),
      },
      uploaded.map((f) => f.id),
    );
    notify(notifyMe ? "Reply posted successfully. You’ll be notified of responses." : "Reply posted successfully");
    setMode({ type: "reply" });
    return true;
  };

  return (
    <div className={styles.view}>
      {viewer ? (
        <div className={styles.viewerBar}>
          <Link href={backHref} className={styles.back}>
            <ArrowLeft size={20} strokeWidth={1.5} aria-hidden />
            Topics
          </Link>
          {!isNotice &&
            (topic.isLocked ? (
              <p className={styles.replyCount} data-muted>
                Locked · doesn&apos;t count toward required posts
              </p>
            ) : (
              <p className={styles.replyCount} data-done={repliesDone || undefined}>
                Your reply {Math.min(myReplies, requiredReplies)} of {requiredReplies}
              </p>
            ))}
        </div>
      ) : (
        <ThreadToolbar
          backHref={backHref}
          topic={topic}
          onTogglePin={() => forum.updateTopic(topicId, { isPinned: !topic.isPinned })}
          onToggleLock={() => forum.updateTopic(topicId, { isLocked: !topic.isLocked })}
          onDeleteTopic={() => setPendingDelete({ kind: "topic" })}
          onGrade={openGrades}
        />
      )}

      <section className={styles.thread} aria-labelledby="thread-title">
        <header className={styles.titleRow}>
          <h2 id="thread-title" className={styles.title}>
            {topic.title}
          </h2>
          <div className={styles.badges}>
            {badges.map((s) => {
              const Icon = BADGE_ICON[s];
              return (
                <span key={s} className={styles.status} data-status={s}>
                  <Icon size={14} strokeWidth={2} aria-hidden />
                  {STATUS_LABEL[s]}
                </span>
              );
            })}
          </div>
        </header>

        <ol className={styles.posts}>
          {posts.map((p) => {
            const mine = isMine(p);
            return (
              <li key={p.id}>
                {viewer ? (
                  <PostCard
                    post={p}
                    now={forum.now}
                    viewer
                    showFeedback={mine}
                    hideReply={isNotice}
                    replyLocked={topic.isLocked || replyBlocked(p)}
                    replyLockedReason={topic.isLocked ? "This topic is locked" : "Replies are turned off for this message"}
                    editLocked={topic.isLocked}
                    reported={p.reportedBy?.includes(myId) ?? false}
                    replyToName={p.replyToId ? postsById.get(p.replyToId)?.author.name : undefined}
                    onSendReply={(html) => sendReply(p, html)}
                    onLinkCopied={notify}
                    onSaveEdit={mine ? (edit) => saveOwnEdit(p, edit) : undefined}
                    onEditBlocked={mine ? undefined : () => notify("You can only edit your own posts")}
                    onReport={(report) => reportPost(p, report)}
                  />
                ) : (
                  <PostCard
                    post={p}
                    now={forum.now}
                    replyLocked={topic.isLocked}
                    replyToName={p.replyToId ? postsById.get(p.replyToId)?.author.name : undefined}
                    onSendReply={(html) => sendReply(p, html)}
                    onLinkCopied={notify}
                    onSaveEdit={(edit) => saveEdit(p, edit)}
                    onDelete={() => setPendingDelete(p.id === openingPostId ? { kind: "topic" } : { kind: "post", post: p })}
                    onConfirmBest={(choice) => confirmBest(p, choice)}
                    onRemoveBest={() => removeBest(p)}
                    onSendPrivate={(payload) => sendPrivate(p, payload)}
                    onSaveFeedback={(feedback) => saveFeedback(p, feedback)}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {viewerReadOnly ? (
        <p className={styles.readOnly}>This is a notice. Replies are turned off.</p>
      ) : (
        <ReplyComposer
          ref={composerRef}
          key={mode.type === "edit" ? `edit-${mode.post.id}` : "compose"}
          mode={mode}
          topicId={topicId}
          locked={topic.isLocked && mode.type !== "edit"}
          viewer={viewer}
          onCancel={() => setMode({ type: "reply" })}
          onSubmit={submit}
          onToast={notify}
        />
      )}

      {!viewer && (
        <ConfirmDialog
          open={pendingDelete !== null}
          title={dialogCopy.title}
          message={dialogCopy.message}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <Toast message={toast.message} />
    </div>
  );
}