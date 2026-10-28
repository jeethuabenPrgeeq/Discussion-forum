"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NotificationIcon } from "@/components/icons";
import { api } from "@/features/forum/lib/api";
import { LEARNER_FORUM_BASE, learnerTopicHref, topicHref } from "@/features/forum/lib/routes";
import { ROLE_HOME, readSessionUser } from "@/features/auth/lib/session";
import styles from "./NotificationBell.module.css";

export const OPEN_TAB_EVENT = "forum:open-tab";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  forumId: string | null;
  topicId: string | null;
  questionId: string | null;
  read: boolean;
  createdAt: string;
}

interface NotificationList {
  unread: number;
  items: NotificationItem[];
}

const POLL_MS = 30_000;

const ago = (iso: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

interface NotificationBellProps {
  buttonClassName?: string;
  dotClassName?: string;
}

export default function NotificationBell({ buttonClassName, dotClassName }: NotificationBellProps) {
  const router = useRouter();
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<NotificationList>({ unread: 0, items: [] });
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api<NotificationList>("/notifications"));
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    void load();
    const onPointer = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, load]);

  const goToTab = (path: string, tab: string) => {
    router.push(`${path}?tab=${tab}`);
    window.dispatchEvent(new CustomEvent(OPEN_TAB_EVENT, { detail: tab }));
  };

  const openItem = (item: NotificationItem) => {
    setOpen(false);
    if (!item.read) {
      setData((d) => ({ unread: Math.max(0, d.unread - 1), items: d.items.map((n) => (n.id === item.id ? { ...n, read: true } : n)) }));
      api<NotificationList>(`/notifications/${item.id}/read`, { method: "POST" }).then(setData).catch(() => undefined);
    }
    const isCreator = readSessionUser()?.role === "creator";
    if (item.topicId) {
      router.push(window.location.pathname.startsWith(LEARNER_FORUM_BASE) ? learnerTopicHref(item.topicId) : topicHref(item.topicId));
    } else if (item.questionId) {
      if (isCreator) goToTab(ROLE_HOME.creator, "questions");
      else goToTab(ROLE_HOME.learner, "grades");
    } else if (item.type === "grade") {
      goToTab(ROLE_HOME.learner, "grades");
    }
  };

  const markAll = () => {
    setData((d) => ({ unread: 0, items: d.items.map((n) => ({ ...n, read: true })) }));
    api<NotificationList>("/notifications/read-all", { method: "POST" }).then(setData).catch(() => undefined);
  };

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={buttonClassName}
        aria-label={data.unread ? `Notifications, ${data.unread} unread` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <NotificationIcon />
        {data.unread > 0 && <span className={dotClassName} />}
      </button>

      {open && (
        <div id={panelId} className={styles.panel} role="dialog" aria-label="Notifications">
          <div className={styles.head}>
            <span className={styles.title}>Notifications</span>
            {data.unread > 0 && (
              <button type="button" className={styles.markAll} onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>
          {data.items.length === 0 ? (
            <p className={styles.empty}>You&apos;re all caught up.</p>
          ) : (
            <ul className={styles.list}>
              {data.items.map((n) => (
                <li key={n.id}>
                  <button type="button" className={styles.item} data-unread={!n.read || undefined} onClick={() => openItem(n)}>
                    <span className={styles.itemTitle}>{n.title}</span>
                    {n.body && <span className={styles.itemBody}>{n.body}</span>}
                    <span className={styles.itemTime}>{ago(n.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}