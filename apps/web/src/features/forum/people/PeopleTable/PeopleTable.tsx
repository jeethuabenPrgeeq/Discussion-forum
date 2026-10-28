"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import DropdownMenu from "@/components/ui/DropdownMenu";
import ProgressMeter from "@/features/forum/ui/ProgressMeter";
import StatusPill from "@/features/forum/ui/StatusPill";
import { PERSON_STATUS_META, displayName, formatShortDate, fullName, progressOf } from "@/features/forum/lib/people";
import { topicHref } from "@/features/forum/lib/routes";
import type { ForumPerson, ForumSettings, PostsSort } from "@/features/forum/lib/types";
import styles from "./PeopleTable.module.css";
import Toast, { useToast } from "@/components/toast/Toast";
import PersonActions from "@/features/forum/people/PersonActions/PersonActions";

interface PeopleTableProps {
  weekId: string;
  people: ForumPerson[];
  settings: ForumSettings;
  postsSort: PostsSort;
  onPostsSortChange: (sort: PostsSort) => void;
  onExport: () => void;
  onRemindNotStarted: () => void;
  emptyMessage: ReactNode;
}

const COLUMN_COUNT = 8;
const NEXT_SORT: Record<PostsSort, PostsSort> = { none: "desc", desc: "asc", asc: "none" };
const ARIA_SORT = { none: "none", desc: "descending", asc: "ascending" } as const;

const shortGroup = (group: string | null) => (group ? group.replace(/^group\s+/i, "") : "-");

export default function PeopleTable({ weekId, people, settings, postsSort, onPostsSortChange, onExport, onRemindNotStarted, emptyMessage }: PeopleTableProps) {
  const toast = useToast();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <colgroup>
          <col className={styles.colName} />
          <col className={styles.colGroup} />
          <col className={styles.colMeter} />
          <col className={styles.colMeter} />
          <col className={styles.colStatus} />
          <col className={styles.colGrade} />
          <col className={styles.colPosts} />
          <col className={styles.colActions} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Learners</th>
            <th scope="col">Group</th>
            <th scope="col">Topics Started</th>
            <th scope="col">Replies made</th>
            <th scope="col">Progress</th>
            <th scope="col">Grade/{settings.maxGrade}</th>
            <th scope="col" aria-sort={ARIA_SORT[postsSort]} data-interactive>
              <button type="button" className={styles.headButton} onClick={() => onPostsSortChange(NEXT_SORT[postsSort])}>
                Posts
                <ChevronDown size={16} strokeWidth={1.5} className={styles.sortIcon} data-dir={postsSort} aria-hidden />
              </button>
            </th>
            <th scope="col" data-interactive>
              <DropdownMenu
                label="Bulk actions"
                triggerClassName={styles.headButton}
                trigger={
                  <>
                    Actions <ChevronDown size={16} strokeWidth={1.5} aria-hidden />
                  </>
                }
                items={[
                  { key: "remind", label: "Remind everyone not started", onSelect: onRemindNotStarted },
                  { key: "export", label: "Export as CSV", onSelect: onExport },
                ]}
              />
            </th>
          </tr>
        </thead>

        {people.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={COLUMN_COUNT} className={styles.empty}>
                {emptyMessage}
              </td>
            </tr>
          </tbody>
        ) : (
          people.map((p) => {
            const progress = progressOf(p, settings);
            const meta = PERSON_STATUS_META[progress.status];
            const open = expanded.has(p.id);
            const count = p.posts.length;

            return (
              <tbody key={p.id} className={styles.group} data-expanded={open || undefined}>
                <tr className={styles.row}>
                  <th scope="row" className={styles.name}>
                    {count > 0 ? (
                      <button type="button" className={styles.nameButton} aria-expanded={open} aria-controls={open ? p.posts.map((post) => `post-row-${post.id}`).join(" ") : undefined} onClick={() => toggle(p.id)}>
                        {displayName(p)}
                      </button>
                    ) : (
                      displayName(p)
                    )}
                    {!p.canPost && <span className={styles.tag}>Posting off</span>}
                  </th>
                  <td data-label="Group" className={styles.groupCell} title={p.group ?? "No group"}>
                    {shortGroup(p.group)}
                  </td>
                  <td data-label="Topics started">
                    <ProgressMeter value={progress.topics} total={progress.topicsRequired} label="topics" />
                  </td>
                  <td data-label="Replies made">
                    <ProgressMeter value={progress.replies} total={progress.repliesRequired} label="replies" />
                  </td>
                  <td data-label="Progress">
                    <StatusPill tone={meta.tone} size="md">
                      {meta.label}
                    </StatusPill>
                  </td>
                  <td data-label={`Grade/${settings.maxGrade}`} className={styles.grade}>
                    {p.grade === null ? "-" : `${p.grade}/${settings.maxGrade}`}
                  </td>
                  <td data-label="Posts">
                    <button type="button" className={styles.pill} disabled={count === 0} aria-expanded={open} aria-controls={open ? p.posts.map((post) => `post-row-${post.id}`).join(" ") : undefined} aria-label={`${count} ${count === 1 ? "post" : "posts"} by ${fullName(p)}`} onClick={() => toggle(p.id)}>
                      {count} {count === 1 ? "post" : "posts"}
                      {open ? <ChevronUp size={20} strokeWidth={1.5} aria-hidden /> : <ChevronDown size={20} strokeWidth={1.5} aria-hidden />}
                    </button>
                  </td>
                  <td data-label="Actions">
                    <PersonActions weekId={weekId} person={p} settings={settings} triggerClassName={styles.pill} onNotify={toast.show} />
                  </td>
                </tr>

                {open &&
                  p.posts.map((post) => {
                    const counted = post.words >= settings.minWords;
                    return (
                      <tr key={post.id} id={`post-row-${post.id}`} className={styles.postRow}>
                        <td colSpan={COLUMN_COUNT}>
                          <div className={styles.post}>
                            <span className={styles.postTitle}>
                              <span className={styles.kind} data-kind={post.kind}>
                                {post.kind === "topic" ? "PO:" : "RE:"}
                              </span>{" "}
                              {post.title}
                            </span>
                            <span className={styles.postMeta}>
                              <span className={styles.metaItem}>{formatShortDate(post.createdAt)}</span>
                              <span className={styles.metaItem}>{post.words} words</span>
                              <StatusPill tone={counted ? "green" : "orange"} size="xs">
                                {counted ? "Counted" : `Under ${settings.minWords}`}
                              </StatusPill>
                              <Link href={topicHref(post.topicId)} className={styles.open}>
                                Open <ChevronRight size={16} strokeWidth={1.25} aria-hidden />
                              </Link>
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            );
          })
        )}
      </table>
      <Toast message={toast.message} />
    </div>
  );
}
