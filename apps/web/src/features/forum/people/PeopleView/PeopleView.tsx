"use client";

import { useId, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { DownloadIcon } from "@/components/icons";
import Select from "@/components/form/Select";
import AddPersonView from "@/features/forum/people/AddPersonView/AddPersonView";
import BulkUploadDialog, { type BulkResult } from "@/features/forum/people/BulkUploadDialog/BulkUploadDialog";
import Pagination from "@/features/forum/ui/Pagination";
import PeopleTable from "@/features/forum/people/PeopleTable/PeopleTable";
import StatusLegend from "@/features/forum/ui/StatusLegend";
import { useForum } from "@/features/forum/lib/store";
import { exportPeopleCsv, filterPeople, progressOf, sortPeopleByPosts } from "@/features/forum/lib/people";
import { GROUP_FILTER_OPTIONS, ROLE_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from "@/features/forum/lib/options";
import type { PeopleFilters, PostsSort } from "@/features/forum/lib/types";
import styles from "./PeopleView.module.css";

const PAGE_SIZE = 7;
const INITIAL_FILTERS: PeopleFilters = { query: "", role: "all", group: "all", status: "any" };

function describeBulk({ added, updated, removed, skipped }: BulkResult) {
  const parts = [added && `${added} added`, updated && `${updated} updated`, removed && `${removed} removed`, skipped && `${skipped} skipped`].filter(Boolean);
  return parts.length ? `Bulk upload: ${parts.join(", ")}.` : "Bulk upload: no changes.";
}

export default function PeopleView() {
  const { weekId, peopleFor, settingsFor, updatePerson } = useForum();
  const settings = settingsFor(weekId);
  const people = peopleFor(weekId);
  const ids = { search: useId(), role: useId(), group: useId(), status: useId() };

  const [mode, setMode] = useState<"list" | "add">("list");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [filters, setFilters] = useState<PeopleFilters>(INITIAL_FILTERS);
  const [postsSort, setPostsSort] = useState<PostsSort>("none");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = useMemo(() => sortPeopleByPosts(filterPeople(people, filters, settings), postsSort), [people, filters, settings, postsSort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const setFilter = <K extends keyof PeopleFilters>(key: K, value: PeopleFilters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  };

  const remindNotStarted = () => {
    const targets = filtered.filter((p) => progressOf(p, settings).status === "not_started" && !p.reminder);
    targets.forEach((p) => updatePerson(weekId, p.id, { reminder: true }));
    setNotice(targets.length ? `Reminder turned on for ${targets.length} ${targets.length === 1 ? "person" : "people"}.` : "Everyone not started already has reminders on.");
  };

  const emptyMessage =
    people.length === 0 ? (
      <>
        No one is enrolled in this week yet.{" "}
        <button type="button" className={styles.link} onClick={() => setMode("add")}>
          Add a person
        </button>
      </>
    ) : (
      <>
        No people match these filters.{" "}
        <button type="button" className={styles.link} onClick={clearFilters}>
          Clear filters
        </button>
      </>
    );

  return (
    <div className={styles.view}>
      <div role="status" aria-live="polite" className={styles.live}>
        {notice && (
          <p className={styles.notice}>
            {notice}
            <button type="button" className={styles.dismiss} aria-label="Dismiss" onClick={() => setNotice(null)}>
              <X size={16} strokeWidth={2} />
            </button>
          </p>
        )}
      </div>

      {mode === "add" ? (
        <AddPersonView
          onBack={() => setMode("list")}
          onBulkUpload={() => setBulkOpen(true)}
          onSaved={(message, addAnother) => {
            setNotice(message);
            if (!addAnother) setMode("list");
          }}
        />
      ) : (
        <>
          <StatusLegend settings={settings} />

          <section className={styles.panel} aria-label="People">
            <div className={styles.toolbar}>
              <div className={styles.filters}>
                <label className={styles.search} htmlFor={ids.search}>
                  <Search size={20} strokeWidth={1.5} aria-hidden />
                  <span className={styles.srOnly}>Search people</span>
                  <input id={ids.search} type="search" placeholder="Search People" value={filters.query} onChange={(e) => setFilter("query", e.target.value)} />
                </label>
                <span className={styles.filter}>
                  <span id={`${ids.role}-label`} className={styles.srOnly}>
                    Filter by role
                  </span>
                  <Select id={ids.role} variant="filter" labelledBy={`${ids.role}-label`} value={filters.role} options={ROLE_FILTER_OPTIONS} onChange={(v) => setFilter("role", v)} />
                </span>
                <span className={styles.filter}>
                  <span id={`${ids.group}-label`} className={styles.srOnly}>
                    Filter by group
                  </span>
                  <Select id={ids.group} variant="filter" labelledBy={`${ids.group}-label`} value={filters.group} options={GROUP_FILTER_OPTIONS} onChange={(v) => setFilter("group", v)} />
                </span>
                <span className={styles.filter}>
                  <span id={`${ids.status}-label`} className={styles.srOnly}>
                    Filter by status
                  </span>
                  <Select id={ids.status} variant="filter" labelledBy={`${ids.status}-label`} value={filters.status} options={STATUS_FILTER_OPTIONS} onChange={(v) => setFilter("status", v)} />
                </span>
              </div>

              <div className={styles.actions}>
                <button type="button" className={styles.button} onClick={() => setBulkOpen(true)}>
                  <DownloadIcon aria-hidden />
                  Bulk Upload
                </button>
                <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => setMode("add")}>
                  <Plus size={24} strokeWidth={1.5} aria-hidden />
                  Add Person
                </button>
              </div>
            </div>

            <PeopleTable
              weekId={weekId}
              people={visible}
              settings={settings}
              postsSort={postsSort}
              onPostsSortChange={(s) => {
                setPostsSort(s);
                setPage(1);
              }}
              onExport={() => exportPeopleCsv(filtered, settings, `forum-${weekId}-people.csv`)}
              onRemindNotStarted={remindNotStarted}
              emptyMessage={emptyMessage}
            />
          </section>

          {filtered.length > 0 && <Pagination page={current} pageCount={pageCount} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />}
        </>
      )}

      {bulkOpen && (
        <BulkUploadDialog
          onClose={() => setBulkOpen(false)}
          onComplete={(result) => {
            setBulkOpen(false);
            setNotice(describeBulk(result));
          }}
        />
      )}
    </div>
  );
}
