"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import WeekTabs from "@/features/forum/ui/WeekTabs";
import ForumHeader from "@/features/forum/ui/ForumHeader";
import ForumTabs, { FORUM_TABS, type ShellTabKey } from "@/features/forum/ui/ForumTabs";
import SettingsView from "@/features/forum/settings/SettingsView/SettingsView";
import PeopleView from "@/features/forum/people/PeopleView/PeopleView";
import GradesView from "@/features/forum/grades/GradesView/GradesView";
import ReportsView from "@/features/forum/reports/ReportsView/ReportsView";
import QuestionsView from "@/features/forum/questions/QuestionsView/QuestionsView";
import AccessView from "@/features/forum/access/AccessView/AccessView";
import { OPEN_TAB_EVENT } from "@/components/notifications/NotificationBell";
import { WEEKS } from "@/features/forum/lib/mock";
import { useForum } from "@/features/forum/lib/store";
import { FORUM_BASE } from "@/features/forum/lib/routes";
import styles from "./ForumShell.module.css";

const isShellTab = (value: string): value is ShellTabKey => FORUM_TABS.some((t) => t.key === value);

export default function ForumShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { weekId, setWeekId, forumDetailFor } = useForum();
  const [tab, setTab] = useState<ShellTabKey>("forum");

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("tab");
    if (fromUrl && isShellTab(fromUrl)) setTab(fromUrl);
    const onOpen = (e: Event) => {
      const key = String((e as CustomEvent<string>).detail);
      if (isShellTab(key)) setTab(key);
    };
    window.addEventListener(OPEN_TAB_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TAB_EVENT, onOpen);
  }, []);

  const forum = forumDetailFor(weekId);
  const tabLabel = FORUM_TABS.find((t) => t.key === tab)?.label ?? "";

  const changeWeek = (id: string) => {
    setWeekId(id);
    if (pathname !== FORUM_BASE) router.push(FORUM_BASE);
  };

  const panelProps = {
    id: `forum-panel-${tab}`,
    role: "tabpanel" as const,
    "aria-labelledby": `forum-tab-${tab}`,
  };

  return (
    <div className={styles.page}>
      <WeekTabs weeks={WEEKS} activeId={weekId} onChange={changeWeek} />
      <ForumHeader forum={forum} />
      <ForumTabs active={tab} onChange={setTab} />
      {tab === "forum" ? (
        <div {...panelProps} className={styles.panel}>
          {children}
        </div>
      ) : tab === "settings" ? (
        <div {...panelProps} className={styles.panel}>
          <SettingsView key={weekId} />
        </div>
      ) : tab === "people" ? (
        <div {...panelProps} className={styles.panel}>
          <PeopleView key={weekId} />
        </div>
      ) : tab === "grades" ? (
        <div {...panelProps}>
          <GradesView key={weekId} />
        </div>
      ) : tab === "reports" ? (
        <div {...panelProps} className={styles.panel}>
          <ReportsView key={weekId} />
        </div>
      ) : tab === "questions" ? (
        <div {...panelProps} className={styles.panel}>
          <QuestionsView key={weekId} />
        </div>
      ) : tab === "access" ? (
        <div {...panelProps} className={styles.panel}>
          <AccessView key={weekId} />
        </div>
      ) : (
        <div {...panelProps} className={styles.placeholder}>
          {tabLabel} is up next.
        </div>
      )}
    </div>
  );
}