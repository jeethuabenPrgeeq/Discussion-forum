'use client';

import { useEffect, useMemo, useState } from 'react';
import Toast, { useToast } from '@/components/toast/Toast';
import { ExportDialog } from '@/features/forum/ui/ExportDialog/ExportDialog';
import { api } from '@/features/forum/lib/api';
import { useForum } from '@/features/forum/lib/store';
import type { PosterActivity, ReportDecision, ReportedPost, ReportStat } from '@/features/forum/lib/reports';
import { ReportCase } from '../ReportCase/ReportCase';
import styles from './ReportsView.module.css';

type ApiReport = ReportedPost & { reportId: string; postId: string; topicId: string };

const errorText = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

export function ReportsView() {
  const { weekId, forumIdFor, peopleFor, loadPeople, loadPosts } = useForum();
  const forumId = forumIdFor(weekId);
  const people = peopleFor(weekId);
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [justResolved, setJustResolved] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!forumId) return;
    let cancelled = false;
    setLoading(true);
    api<ApiReport[]>(`/forums/${forumId}/reports`)
      .then((list) => {
        if (!cancelled) setReports(list);
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.show(errorText(error, 'Could not load reports'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [forumId]);

  const learners = useMemo(() => people.filter((p) => p.role === 'learner'), [people]);

  const stats = useMemo<ReportStat[]>(() => {
    const posted = learners.filter((p) => p.posts.length > 0);
    const totalPosts = people.reduce((n, p) => n + p.posts.length, 0);
    const replies = posted.reduce((n, p) => n + p.posts.filter((post) => post.kind === 'reply').length, 0);
    const graded = learners.filter((p) => p.grade !== null);
    const gradeSum = graded.reduce((n, p) => n + (p.grade ?? 0), 0);
    return [
      { key: 'posts', label: 'Posts', value: String(totalPosts), tone: 'blue' },
      { key: 'learners', label: 'Learners Posted', value: `${posted.length} / ${learners.length}`, tone: 'purple' },
      { key: 'replies', label: 'Replies each', value: posted.length ? (replies / posted.length).toFixed(1) : '0', tone: 'green' },
      { key: 'reported', label: 'Reported', value: String(reports.length), tone: 'orange' },
      { key: 'avg', label: 'avg grade', value: graded.length ? (gradeSum / graded.length).toFixed(1) : '-', tone: 'orange' },
    ];
  }, [people, learners, reports.length]);

  const posters = useMemo<PosterActivity[]>(
    () =>
      learners
        .map((p) => ({ name: `${p.firstName} ${p.lastName.charAt(0)}`.trim(), posts: p.posts.length }))
        .sort((a, b) => b.posts - a.posts),
    [learners],
  );

  const barScale = Math.max(0, ...posters.map((p) => p.posts)) + 2;
  const openReport = reports.find((r) => r.id === openId);

  const closeReport = () => {
    setOpenId(null);
    setJustResolved(false);
  };

  const handleResolve = async (report: ApiReport, decision: ReportDecision, note: string) => {
    try {
      const updated = await api<ApiReport>(`/reports/${report.reportId}/resolve`, {
        method: 'POST',
        json: { decision, note: note.trim() || undefined },
      });
      setReports((prev) => prev.map((r) => (r.reportId === updated.reportId ? updated : r)));
      setJustResolved(true);
      loadPosts(updated.topicId, true).catch(() => undefined);
      loadPeople(weekId, true).catch(() => undefined);
    } catch (error) {
      toast.show(errorText(error, 'Could not resolve the report'));
    }
  };

  if (openReport) {
    return (
      <>
        <ReportCase
          report={openReport}
          justResolved={justResolved}
          onBack={closeReport}
          onResolve={(decision, note) => handleResolve(openReport, decision, note)}
        />
        <Toast message={toast.message} />
      </>
    );
  }

  return (
    <div className={styles.view}>
      <section className={styles.stats} aria-label="Forum summary">
        {stats.map((stat) => (
          <div key={stat.key} className={styles.stat}>
            <span className={styles.statLabel}>{stat.label}</span>
            <span className={`${styles.statValue} ${styles[stat.tone]}`}>{stat.value}</span>
          </div>
        ))}
      </section>

      <section className={styles.card} aria-labelledby="who-posted-title">
        <h2 id="who-posted-title" className={styles.cardTitle}>
          Who Posted
        </h2>
        <table className={styles.table}>
          <colgroup>
            <col className={styles.colName} />
            <col />
          </colgroup>
          <thead className={styles.srOnly}>
            <tr>
              <th scope="col">Learner</th>
              <th scope="col">Posts</th>
            </tr>
          </thead>
          <tbody>
            {posters.map((p) => (
              <tr key={p.name}>
                <th scope="row" className={styles.posterName}>
                  {p.name}
                </th>
                <td className={styles.barCell}>
                  <div className={styles.barRow}>
                    <span className={styles.track} aria-hidden>
                      <span className={styles.fill} style={{ width: `${(p.posts / barScale) * 100}%` }} />
                    </span>
                    <span className={styles.count}>{p.posts}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.card} aria-label="Reported posts">
        <div className={styles.tableScroll}>
          <table className={`${styles.table} ${styles.reportTable}`}>
            <colgroup>
              <col className={styles.colReported} />
              <col className={styles.colBy} />
              <col className={styles.colWhy} />
              <col className={styles.colStatus} />
              <col className={styles.colAction} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Reported</th>
                <th scope="col">By</th>
                <th scope="col">Why</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className={styles.srOnly}>Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={5}>{loading ? 'Loading reports…' : 'No reports for this week.'}</td>
                </tr>
              ) : (
                reports.map((r) => {
                  const pending = r.status === 'pending';
                  return (
                    <tr key={r.reportId}>
                      <td className={styles.reportLabel}>{r.label}</td>
                      <td>{r.reporter}</td>
                      <td>{r.reason}</td>
                      <td>
                        <span className={`${styles.pill} ${pending ? styles.pending : styles.resolved}`}>
                          {pending ? 'Pending' : 'Resolved'}
                        </span>
                      </td>
                      <td className={styles.actionCell}>
                        <button
                          type="button"
                          className={styles.link}
                          onClick={() => setOpenId(r.id)}
                          aria-label={`${pending ? 'Review' : 'View'} report ${r.label}`}
                        >
                          {pending ? 'Review' : 'View'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <button type="button" className={styles.exportBtn} onClick={() => setExportOpen(true)}>
        Export
      </button>

      {exportOpen && (
        <ExportDialog
          onClose={() => setExportOpen(false)}
          onExport={() => {
            setExportOpen(false);
            toast.show('Export started');
          }}
        />
      )}

      <Toast message={toast.message} />
    </div>
  );
}

export default ReportsView;