"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { DeleteIcon, LockKeyholeIcon, MoveIcon, PinIcon } from "@/components/icons";
import type { ForumTopic } from "@/features/forum/lib/types";
import { STATUS_LABEL, pad2, statusOf, timeAgo } from "@/features/forum/lib/utils";
import styles from "./TopicsTable.module.css";
import { topicHref } from "@/features/forum/lib/routes";

const PARTICIPATION = { required: "Required", optional: "Optional" } as const;

interface IconButtonProps {
  label: string;
  context: string;
  pressed?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function IconButton({ label, context, pressed, danger, onClick, children }: IconButtonProps) {
  return (
    <button type="button" className={styles.iconBtn} title={label} aria-label={`${label}: ${context}`} aria-pressed={pressed} data-tone={danger ? "danger" : undefined} onClick={onClick}>
      {children}
    </button>
  );
}

interface TopicsTableProps {
  rows: ForumTopic[];
  hasTopics: boolean;
  now: number;
  onTogglePin: (topic: ForumTopic) => void;
  onToggleLock: (topic: ForumTopic) => void;
  onMove: (topic: ForumTopic) => void;
  onDelete: (topic: ForumTopic) => void;
}

export default function TopicsTable({ rows, hasTopics, now, onTogglePin, onToggleLock, onMove, onDelete }: TopicsTableProps) {
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
          const status = statusOf(t);
          return (
            <tr key={t.id} className={styles.row}>
              <th scope="row" className={`${styles.cell} ${styles.topic}`}>
                <Link href={topicHref(t.id)}>{t.title}</Link>
              </th>
              <td className={styles.cell} data-label="Created By">
                {t.createdBy}
              </td>
              <td className={styles.cell} data-label="Replies">
                {t.replies ? pad2(t.replies) : "0"}
              </td>
              <td className={styles.cell} data-label="Last Activity">
                <time dateTime={t.lastActivityAt}>{timeAgo(t.lastActivityAt, now)}</time>
              </td>
              <td className={styles.cell} data-label="Status">
                <span className={styles.status} data-status={status}>
                  <span className={styles.dot} />
                  {STATUS_LABEL[status]}
                </span>
              </td>
              <td className={styles.cell} data-label="Participation">
                {t.participation ? PARTICIPATION[t.participation] : "-"}
              </td>
              <td className={`${styles.cell} ${styles.actionsCell}`}>
                <div className={styles.actions}>
                  <IconButton label="Pin topic" context={t.title} pressed={t.isPinned} onClick={() => onTogglePin(t)}>
                    <PinIcon />
                  </IconButton>
                  <IconButton label="Lock topic" context={t.title} pressed={t.isLocked} onClick={() => onToggleLock(t)}>
                    <LockKeyholeIcon />
                  </IconButton>
                  <IconButton label="Move topic" context={t.title} onClick={() => onMove(t)}>
                    <MoveIcon />
                  </IconButton>
                  <IconButton label="Delete topic" context={t.title} danger onClick={() => onDelete(t)}>
                    <DeleteIcon />
                  </IconButton>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
