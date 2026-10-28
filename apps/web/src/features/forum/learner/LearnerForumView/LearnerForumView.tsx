"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Download, Plus, Search } from "lucide-react";
import ChoiceMenu from "@/components/form/ChoiceMenu/ChoiceMenu";
import RadioDropdown from "@/components/form/RadioDropdown";
import Toast, { useToast } from "@/components/toast/Toast";
import { ExportDialog } from "@/features/forum/ui/ExportDialog/ExportDialog";
import AttachBox from "@/features/forum/learner/AttachBox/AttachBox";
import LearnerStats from "@/features/forum/learner/LearnerStats/LearnerStats";
import LearnerPager, { getPageWindow } from "@/features/forum/learner/LearnerPager/LearnerPager";
import { learnerTopicHref } from "@/features/forum/lib/routes";
import {
  LEARNER_EXPORT_SECTIONS,
  LEARNER_GROUPS,
  TOPIC_FILTERS,
  TOPIC_SORTS,
  TOPIC_STATUS_LABEL,
  type LearnerTopic,
  type TopicFilter,
  type TopicSort,
} from "@/features/forum/lib/learner";
import styles from "./LearnerForumView.module.css";

const PAGE_SIZE = 5;

const pad2 = (n: number) => String(n).padStart(2, "0");

const activityLabel = (hours: number) => {
  if (hours === 0) return "Just now";
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
};

const compareBy = (sort: TopicSort) => (a: LearnerTopic, b: LearnerTopic) => {
  if (sort === "replies") return b.replies - a.replies;
  if (sort === "oldest") return b.createdHours - a.createdHours;
  if (sort === "az") return a.title.localeCompare(b.title);
  return a.lastActivityHours - b.lastActivityHours;
};

interface LearnerForumViewProps {
  topics: LearnerTopic[];
  canStartTopic?: boolean;
  subscribedIds?: ReadonlySet<string>;
  onNewTopic: () => void;
  onToggleRead?: (topic: LearnerTopic, read: boolean) => void | Promise<void>;
  onToggleSubscribe?: (topic: LearnerTopic, subscribed: boolean) => void | Promise<void>;
}

export default function LearnerForumView({
  topics: allTopics,
  canStartTopic = true,
  subscribedIds,
  onNewTopic,
  onToggleRead,
  onToggleSubscribe,
}: LearnerForumViewProps) {
  const router = useRouter();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [filter, setFilter] = useState<TopicFilter>("all");
  const [sort, setSort] = useState<TopicSort>("latest");
  const [titleSort, setTitleSort] = useState<"asc" | "desc" | null>(null);
  const [page, setPage] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});
  const [subOverrides, setSubOverrides] = useState<Record<string, boolean>>({});

  const isRead = (t: LearnerTopic) => readOverrides[t.id] ?? !t.unread;
  const isSubscribed = (t: LearnerTopic) => subOverrides[t.id] ?? subscribedIds?.has(t.id) ?? false;

  const topics = useMemo(() => {
    const q = query.trim().toLowerCase();
    const read = (t: LearnerTopic) => readOverrides[t.id] ?? !t.unread;
    const matches = (t: LearnerTopic) => {
      if (filter === "all") return true;
      if (filter === "unread") return !read(t);
      if (filter === "mine") return t.mine;
      return t.status === filter;
    };
    const list = allTopics.filter(
      (t) =>
        (group === "all" || t.group === group) &&
        matches(t) &&
        (!q || t.title.toLowerCase().includes(q) || t.createdBy.toLowerCase().includes(q)),
    );
    if (titleSort) {
      return [...list].sort((a, b) => (titleSort === "asc" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)));
    }
    return [...list].sort(compareBy(sort));
  }, [allTopics, query, group, filter, sort, titleSort, readOverrides]);

  const { start, end } = getPageWindow(topics.length, page, PAGE_SIZE);
  const visible = topics.slice(start, end);

  const toggleRead = async (topic: LearnerTopic) => {
    const next = !isRead(topic);
    const previous = readOverrides[topic.id];
    setReadOverrides((o) => ({ ...o, [topic.id]: next }));
    try {
      await onToggleRead?.(topic, next);
      toast.show(next ? `Marked "${topic.title}" as read` : `Marked "${topic.title}" as unread`);
    } catch {
      setReadOverrides((o) => {
        const copy = { ...o };
        if (previous === undefined) delete copy[topic.id];
        else copy[topic.id] = previous;
        return copy;
      });
      toast.show("Could not update the topic. Please try again.");
    }
  };

  const toggleSubscribe = async (topic: LearnerTopic) => {
    const next = !isSubscribed(topic);
    const previous = subOverrides[topic.id];
    setSubOverrides((o) => ({ ...o, [topic.id]: next }));
    try {
      await onToggleSubscribe?.(topic, next);
      toast.show(next ? `Subscribed to "${topic.title}"` : `Unsubscribed from "${topic.title}"`);
    } catch {
      setSubOverrides((o) => {
        const copy = { ...o };
        if (previous === undefined) delete copy[topic.id];
        else copy[topic.id] = previous;
        return copy;
      });
      toast.show("Could not update the subscription. Please try again.");
    }
  };

  const toggleTitleSort = () => {
    setTitleSort((s) => (s === "asc" ? "desc" : "asc"));
    setPage(1);
  };

  return (
    <div className={styles.view}>
      <LearnerStats />

      <AttachBox files={files} onChange={setFiles} />

      <section className={styles.card} aria-label="Topics">
        <div className={styles.toolbar}>
          <div className={styles.filters}>
            <label className={styles.search}>
              <Search size={20} strokeWidth={1.75} aria-hidden />
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Search topics"
                aria-label="Search topics"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <RadioDropdown
              ariaLabel="Group"
              value={group}
              options={LEARNER_GROUPS}
              onChange={(v) => {
                setGroup(v);
                setPage(1);
              }}
            />
            <RadioDropdown
              ariaLabel="Topic filter"
              value={filter}
              options={TOPIC_FILTERS}
              onChange={(v) => {
                setFilter(v);
                setPage(1);
              }}
            />
            <RadioDropdown
              ariaLabel="Sort"
              value={sort}
              options={TOPIC_SORTS}
              onChange={(v) => {
                setSort(v);
                setTitleSort(null);
                setPage(1);
              }}
            />
          </div>
          <div className={styles.toolActions}>
            <button type="button" className={styles.toolBtn} onClick={() => setExportOpen(true)}>
              <Download size={20} strokeWidth={1.5} aria-hidden />
              Export
            </button>
            {canStartTopic && (
              <button type="button" className={`${styles.toolBtn} ${styles.newTopic}`} onClick={onNewTopic}>
                <Plus size={20} strokeWidth={1.75} aria-hidden />
                New Topic
              </button>
            )}
          </div>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <colgroup>
              <col className={styles.colTopic} />
              <col className={styles.colBy} />
              <col className={styles.colReplies} />
              <col className={styles.colActivity} />
              <col className={styles.colStatus} />
              <col className={styles.colNeeded} />
              <col className={styles.colActions} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" aria-sort={titleSort === "asc" ? "ascending" : titleSort === "desc" ? "descending" : "none"}>
                  <button type="button" className={styles.sortBtn} onClick={toggleTitleSort}>
                    Topic
                    <ChevronDown size={18} strokeWidth={1.75} aria-hidden className={titleSort === "desc" ? styles.sortIconUp : undefined} />
                  </button>
                </th>
                <th scope="col">Created By</th>
                <th scope="col">Replies</th>
                <th scope="col">Last Activity</th>
                <th scope="col">Status</th>
                <th scope="col">Reply Needed</th>
                <th scope="col" className={styles.center}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    No topics match your filters
                  </td>
                </tr>
              ) : (
                visible.map((t) => (
                  <tr key={t.id}>
                    <td className={styles.topicCell}>
                      <Link href={learnerTopicHref(t.id)} className={styles.topicLink}>
                        {t.title}
                      </Link>
                    </td>
                    <td>{t.createdBy}</td>
                    <td>{t.replies === 0 ? "0" : pad2(t.replies)}</td>
                    <td>{activityLabel(t.lastActivityHours)}</td>
                    <td>
                      <span className={`${styles.status} ${styles[t.status]}`}>
                        <span className={styles.dot} aria-hidden />
                        {TOPIC_STATUS_LABEL[t.status]}
                      </span>
                    </td>
                    <td>{t.replyNeeded === "required" ? "Required" : t.replyNeeded === "optional" ? "Optional" : "-"}</td>
                    <td className={styles.center}>
                      <ChoiceMenu
                        title={t.title}
                        items={[
                          { key: "subscribe", label: "Subscribe", checked: isSubscribed(t), onSelect: () => void toggleSubscribe(t) },
                          { key: "read", label: "Mark as read", checked: isRead(t), onSelect: () => void toggleRead(t) },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <LearnerPager total={topics.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} label="Topic pages" />

      {exportOpen && (
        <ExportDialog sections={LEARNER_EXPORT_SECTIONS} onClose={() => setExportOpen(false)} onExport={() => toast.show("Export started")} />
      )}
      <Toast message={toast.message} />
    </div>
  );
}