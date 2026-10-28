"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StatCards from "@/features/forum/ui/StatCards";
import AttachDropzone from "@/features/forum/topics/AttachDropzone/AttachDropzone";
import TopicsToolbar from "@/features/forum/topics/TopicsToolbar/TopicsToolbar";
import TopicsTable from "@/features/forum/topics/TopicsTable/TopicsTable";
import Pagination from "@/features/forum/ui/Pagination";
import MoveTopicDialog from "@/features/forum/topics/MoveTopicDialog/MoveTopicDialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { GROUPS, WEEKS } from "@/features/forum/lib/mock";
import { useForum } from "@/features/forum/lib/store";
import { FORUM_BASE } from "@/features/forum/lib/routes";
import { exportTopicsCsv, filterTopics } from "@/features/forum/lib/utils";
import type { ForumStats, ForumTopic, TopicFilters } from "@/features/forum/lib/types";
import styles from "./TopicsView.module.css";

const PAGE_SIZE = 7;
const DEFAULT_FILTERS: TopicFilters = { query: "", group: "all", status: "all", sort: "latest" };

export default function TopicsView() {
  const router = useRouter();
  const { now, weekId, topicsByWeek, updateTopic, deleteTopic, moveTopic, forumDetailFor } = useForum();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [moving, setMoving] = useState<ForumTopic | null>(null);
  const [deleting, setDeleting] = useState<ForumTopic | null>(null);
  const [filtersWeek, setFiltersWeek] = useState(weekId);

  if (filtersWeek !== weekId) {
    setFiltersWeek(weekId);
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  const forum = forumDetailFor(weekId);
  const topics = useMemo(() => topicsByWeek[weekId] ?? [], [topicsByWeek, weekId]);
  const filtered = useMemo(() => filterTopics(topics, filters), [topics, filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats: ForumStats = {
    topics: topics.length,
    posts: topics.reduce((sum, t) => sum + t.replies + 1, 0),
    active: `${forum.postedCount}/${forum.totalCount}`,
    reported: topics.filter((t) => (t.reportCount ?? 0) > 0).length,
  };

  const changeFilters = (next: Partial<TopicFilters>) => {
    setFilters((f) => ({ ...f, ...next }));
    setPage(1);
  };

  return (
    <div className={styles.view}>
      <div className={styles.summary}>
        <StatCards stats={stats} />
        <AttachDropzone />
      </div>

      <section className={styles.topicsCard} aria-label="Forum topics">
        <TopicsToolbar filters={filters} groups={GROUPS} onChange={changeFilters} onExport={() => exportTopicsCsv(filtered, `${forum.id}-topics.csv`)} onNewTopic={() => router.push(`${FORUM_BASE}/new`)} />
        <TopicsTable rows={rows} hasTopics={topics.length > 0} now={now} onTogglePin={(t) => updateTopic(t.id, { isPinned: !t.isPinned })} onToggleLock={(t) => updateTopic(t.id, { isLocked: !t.isLocked })} onToggleAnswered={(t) => updateTopic(t.id, { state: t.state === "answered" ? "open" : "answered" })} onToggleNotice={(t) => updateTopic(t.id, { state: t.state === "notice" ? "open" : "notice" })} onMove={setMoving} onDelete={setDeleting} />
      </section>

      <Pagination page={currentPage} pageCount={pageCount} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />

      {moving && (
        <MoveTopicDialog
          topic={moving}
          weeks={WEEKS.filter((w) => w.id !== weekId)}
          onCancel={() => setMoving(null)}
          onConfirm={(target) => {
            moveTopic(moving.id, target);
            setMoving(null);
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this topic?"
        message={deleting ? `"${deleting.title}" and all its posts will be deleted. This can't be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleting) deleteTopic(deleting.id);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
