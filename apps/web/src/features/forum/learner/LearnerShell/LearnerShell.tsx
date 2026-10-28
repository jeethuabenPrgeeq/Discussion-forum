"use client";

import { useEffect, useMemo, useState } from "react";
import WeekTabs from "@/features/forum/ui/WeekTabs";
import ForumHeader from "@/features/forum/ui/ForumHeader";
import Toast, { useToast } from "@/components/toast/Toast";
import { OPEN_TAB_EVENT } from "@/components/notifications/NotificationBell";
import LearnerForumView from "@/features/forum/learner/LearnerForumView/LearnerForumView";
import LearnerNewTopic from "@/features/forum/learner/LearnerNewTopic/LearnerNewTopic";
import LearnerProgressView from "@/features/forum/learner/LearnerProgressView/LearnerProgressView";
import LearnerGradesView from "@/features/forum/learner/LearnerGradesView/LearnerGradesView";
import LearnerAlertsView from "@/features/forum/learner/LearnerAlertsView/LearnerAlertsView";
import MyQuestions from "@/features/forum/learner/MyQuestions/MyQuestions";
import { WEEKS } from "@/features/forum/lib/mock";
import { uploadFiles } from "@/features/forum/lib/api";
import { useForum } from "@/features/forum/lib/store";
import { readSessionUser } from "@/features/auth/lib/session";
import {
  LEARNER_SUMMARY,
  LEARNER_TABS,
  type LearnerTabKey,
  type LearnerTopic,
  type NewTopicInput,
} from "@/features/forum/lib/learner";
import type { ForumTopic } from "@/features/forum/lib/types";
import styles from "./LearnerShell.module.css";

type ForumView = "list" | "new";

type ApiTopic = ForumTopic & { authorId?: string };

const DEFAULT_MIN_WORDS = 100;
const HOUR = 3_600_000;

const hoursSince = (value: string | undefined, now: number) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : Math.max(0, Math.floor((now - time) / HOUR));
};

const statusOf = (t: ForumTopic): LearnerTopic["status"] => {
  if (t.isLocked) return "locked";
  if (t.isPinned) return "pinned";
  if (t.state === "answered") return "answered";
  return "open";
};

const toLearnerTopic = (t: ApiTopic, now: number, myId: string | null): LearnerTopic => ({
  id: t.id,
  title: t.title,
  createdBy: myId && t.authorId === myId ? "You" : t.createdBy,
  group: t.group ?? "",
  replies: t.replies,
  lastActivityHours: hoursSince(t.lastActivityAt, now),
  createdHours: hoursSince(t.createdAt ?? t.lastActivityAt, now),
  status: statusOf(t),
  replyNeeded: t.participation === "required" || t.participation === "optional" ? t.participation : null,
  mine: !!myId && t.authorId === myId,
  unread: !!t.isUnread,
});

const isLearnerTab = (value: string): value is LearnerTabKey => LEARNER_TABS.some((t) => t.key === value);

export default function LearnerShell() {
  const { weekId, setWeekId, settingsFor, forumDetailFor, topicsByWeek, now, createTopic } = useForum();
  const [tab, setTab] = useState<LearnerTabKey>("forum");
  const [forumView, setForumView] = useState<ForumView>("list");
  const [myId, setMyId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    setMyId(readSessionUser()?.id ?? null);
    const fromUrl = new URLSearchParams(window.location.search).get("tab");
    if (fromUrl && isLearnerTab(fromUrl)) setTab(fromUrl);
    const onOpen = (e: Event) => {
      const key = String((e as CustomEvent<string>).detail);
      if (isLearnerTab(key)) setTab(key);
    };
    window.addEventListener(OPEN_TAB_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TAB_EVENT, onOpen);
  }, []);

  const settings = settingsFor(weekId);
  const forumDetail = forumDetailFor(weekId);
  const minWords = settings.minWords > 0 ? settings.minWords : DEFAULT_MIN_WORDS;

  const topics = useMemo(
    () => (topicsByWeek[weekId] ?? []).map((t) => toLearnerTopic(t as ApiTopic, now, myId)),
    [topicsByWeek, weekId, now, myId],
  );

  const changeWeek = (id: string) => {
    setWeekId(id);
    setForumView("list");
  };

  const addTopic = async (input: NewTopicInput) => {
    try {
      const uploaded = input.files?.length ? await uploadFiles(input.files) : [];
      await createTopic(weekId, {
        title: input.title,
        body: input.message,
        group: input.group,
        attachmentIds: uploaded.map((f) => f.id),
      });
      setForumView("list");
      toast.show("Topic posted");
      return true;
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Could not post the topic");
      return false;
    }
  };

  const renderPanel = () => {
    if (tab === "progress") return <LearnerProgressView key={weekId} minWords={minWords} />;
    if (tab === "grades") {
      return (
        <>
          <LearnerGradesView key={weekId} />
          <MyQuestions key={`questions-${weekId}`} />
        </>
      );
    }
    if (tab === "alerts") return <LearnerAlertsView key={weekId} weekId={weekId} />;
    if (forumView === "new") {
      return <LearnerNewTopic weekId={weekId} onCancel={() => setForumView("list")} onPost={addTopic} />;
    }
    return (
      <LearnerForumView key={weekId} topics={topics} canStartTopic={settings.learnersStartTopics} onNewTopic={() => setForumView("new")} />
    );
  };

  return (
    <div className={styles.page}>
      <WeekTabs weeks={WEEKS} activeId={weekId} onChange={changeWeek} />
      <ForumHeader forum={forumDetail} status={<span className={styles.due}>Due in {LEARNER_SUMMARY.dueIn}</span>} />

      <div className={styles.tabs} role="tablist" aria-label="Forum sections">
        {LEARNER_TABS.map((t) => (
          <button
            key={t.key}
            id={`learner-tab-${t.key}`}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={tab === t.key}
            aria-controls={`learner-panel-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id={`learner-panel-${tab}`} role="tabpanel" aria-labelledby={`learner-tab-${tab}`}>
        {renderPanel()}
      </div>

      <Toast message={toast.message} />
    </div>
  );
}