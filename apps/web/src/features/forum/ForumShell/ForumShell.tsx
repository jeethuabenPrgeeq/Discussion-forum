"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import WeekTabs from "@/features/forum/ui/WeekTabs";
import ForumHeader from "@/features/forum/ui/ForumHeader";
import ForumTabs, { FORUM_TABS } from "@/features/forum/ui/ForumTabs";
import SettingsView from "@/features/forum/settings/SettingsView/SettingsView";
import PeopleView from "@/features/forum/people/PeopleView/PeopleView";
import { WEEKS, getForumDetail } from "@/features/forum/lib/mock";
import { useForum } from "@/features/forum/lib/store";
import { FORUM_BASE } from "@/features/forum/lib/routes";
import type { ForumTabKey } from "@/features/forum/lib/types";
import styles from "./ForumShell.module.css";
import GradesView from "@/features/forum/grades/GradesView/GradesView";

export default function ForumShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { weekId, setWeekId, settingsFor } = useForum();
  const [tab, setTab] = useState<ForumTabKey>("forum");

  const week = WEEKS.find((w) => w.id === weekId) ?? WEEKS[0];
  const forum = getForumDetail(week, settingsFor(weekId));
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
      ) : (
        <div {...panelProps} className={styles.placeholder}>
          {tabLabel} is up next.
        </div>
      )}
    </div>
  );
}
