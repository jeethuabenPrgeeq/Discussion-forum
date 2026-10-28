"use client";

import Link from "next/link";
import ChoiceMenu from "@/components/form/ChoiceMenu/ChoiceMenu";
import type { ForumTopic } from "@/features/forum/lib/types";
import { STATUS_LABEL, pad2, statusOf, timeAgo } from "@/features/forum/lib/utils";
import { topicHref } from "@/features/forum/lib/routes";
import styles from "./TopicsTable.module.css";

const PARTICIPATION = { required: "Required", optional: "Optional" } as const;

function displayStatus(topic: ForumTopic): { key: string; label: string } {
  const base = statusOf(topic);
  if (topic.isUnread && (base === "open" || base === "notice")) return { key: "unread", label: "Unread" };
  return { key: base, label: STATUS_LABEL[base] };
}

function shortGroup(group: string): string {
  return group.replace(/^group\s+/i, "") || "-";
}

interface TopicsTableProps {
  rows: ForumTopic[];
  hasTopics: boolean;
  now: number;
  onTogglePin: (topic: ForumTopic) => void;
  onToggleLock: (topic: ForumTopic) => void;
  onToggleAnswered: (topic: ForumTopic) => void;
  onToggleNotice: (topic: ForumTopic) => void;
  onMove: (topic: ForumTopic) => void;
  onDelete: (topic: ForumTopic) => void;
}

export default function TopicsTable({
  rows,
  hasTopics,
  now,
  onTogglePin,
  onToggleLock,
  onToggleAnswered,
  onToggleNotice,
  onMove,
  onDelete,
}: TopicsTableProps) {
  if (!rows.length) {
    return <div className={styles.empty}>{hasTopics ? "No topics match these filters." : "No topics yet. Start one with New Topic."}</div>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col" className={styles.colTopic}>
            Topic
          </th>
          <th scope="col" className={styles.colAuthor}>
            Created By
          </th>
          <th scope="col" className={styles.colGroup}>
            Group
          </th>
          <th scope="col" className={styles.colReplies}>
            Replies
          </th>
          <th scope="col" className={styles.colActivity}>
            Last Activity
          </th>
          <th scope="col" className={styles.colStatus}>
            Status
          </th>
          <th scope="col" className={styles.colParticipation}>
            Participation
          </th>
          <th scope="col" className={styles.colActions}>
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t) => {
          const status = displayStatus(t);
          return (
            <tr key={t.id} className={styles.row}>
              <th scope="row" className={`${styles.cell} ${styles.topic}`}>
                <Link href={topicHref(t.id)}>{t.title}</Link>
              </th>
              <td className={styles.cell} data-label="Created By">
                {t.createdBy}
              </td>
              <td className={styles.cell} data-label="Group" title={t.group}>
                {shortGroup(t.group)}
              </td>
              <td className={styles.cell} data-label="Replies">
                {t.replies ? pad2(t.replies) : "0"}
              </td>
              <td className={styles.cell} data-label="Last Activity">
                <time dateTime={t.lastActivityAt}>{timeAgo(t.lastActivityAt, now)}</time>
              </td>
              <td className={styles.cell} data-label="Status">
                <span className={styles.status} data-status={status.key}>
                  <span className={styles.dot} />
                  {status.label}
                </span>
              </td>
              <td className={styles.cell} data-label="Participation">
                {t.participation ? PARTICIPATION[t.participation] : "-"}
              </td>
              <td className={`${styles.cell} ${styles.actionsCell}`}>
                <ChoiceMenu
                  title={t.title}
                  items={[
                    { key: "pin", label: "Pin/ unpin", checked: t.isPinned, onSelect: () => onTogglePin(t) },
                    { key: "lock", label: "Lock/unlock", checked: t.isLocked, onSelect: () => onToggleLock(t) },
                    { key: "answered", label: "Answered", checked: t.state === "answered", onSelect: () => onToggleAnswered(t) },
                    { key: "move", label: "Move", onSelect: () => onMove(t) },
                    { key: "notice", label: "Notice", checked: t.state === "notice", onSelect: () => onToggleNotice(t) },
                    { key: "delete", label: "Delete", onSelect: () => onDelete(t) },
                  ]}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}