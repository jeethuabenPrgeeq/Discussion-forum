'use client';

import { useMemo, useState } from 'react';
import { CircleCheck, Search } from 'lucide-react';
import { DownloadIcon } from '@/components/icons';
import Select from '@/components/form/Select';
import Toast, { useToast } from '@/components/toast/Toast';
import EvaluationView from '@/features/forum/grades/EvaluationView/EvaluationView';
import Pagination from '@/features/forum/ui/Pagination';
import StatusPill from '@/features/forum/ui/StatusPill';
import { useForum } from '@/features/forum/lib/store';
import { GROUPS, WEEKS } from '@/features/forum/lib/mock';
import {
  EVALUATION_STATUS_META,
  POST_MAX,
  REPLY_MAX,
  RUBRIC,
  TOTAL_MAX,
  emptyEvaluation,
  exportGradesCsv,
  formatMark,
  initialsFor,
  scoresOf,
  studentIdOf,
} from '@/features/forum/lib/grading';
import { displayName, fullName, progressOf } from '@/features/forum/lib/people';
import { pad2 } from '@/features/forum/lib/utils';
import type { EvaluationStatus } from '@/features/forum/lib/types';
import styles from './GradesView.module.css';

const PAGE_SIZE = 7;
const AVATAR_TONES = ['#E01E5A', '#67096E', '#2D4CC8', '#2A7308', '#63560B'];
const SUBJECT = 'Data Structures';

type StatusFilter = EvaluationStatus | 'all';

interface Filters {
  course: string;
  subject: string;
  topic: string;
  batch: string;
  status: StatusFilter;
  query: string;
}

const INITIAL_FILTERS: Filters = { course: 'all', subject: 'all', topic: 'all', batch: 'all', status: 'all', query: '' };

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'draft', label: 'Draft' },
  { value: 'evaluated', label: 'Evaluated' },
  { value: 'published', label: 'Published' },
];

export default function GradesView() {
  const { weekId, peopleFor, settingsFor, evaluationFor } = useForum();
  const [openId, setOpenId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const toast = useToast();

  const week = WEEKS.find((w) => w.id === weekId) ?? WEEKS[0];
  const settings = settingsFor(weekId);
  const people = peopleFor(weekId);

  const rows = useMemo(
    () =>
      people.map((person, index) => {
        const evaluation = evaluationFor(weekId, person.id) ?? emptyEvaluation(person);
        return { person, index, evaluation, scores: scoresOf(evaluation), progress: progressOf(person, settings) };
      }),
    [people, evaluationFor, weekId, settings],
  );

  const stats = useMemo(() => {
    const count = (s: EvaluationStatus) => rows.filter((r) => r.evaluation.status === s).length;
    const graded = rows.filter((r) => r.evaluation.status === 'evaluated' || r.evaluation.status === 'published');
    const average = graded.length
      ? `${Math.round(graded.reduce((sum, r) => sum + r.scores.total, 0) / graded.length)}/${TOTAL_MAX}`
      : '—';
    return [
      { tone: 'orange', value: pad2(count('pending')), label: 'Pending' },
      { tone: 'blue', value: pad2(count('draft')), label: 'Draft' },
      { tone: 'purple', value: pad2(count('evaluated')), label: 'Evaluated' },
      { tone: 'green', value: pad2(count('published')), label: 'Published' },
      { tone: 'olive', value: average, label: 'Class Average' },
    ];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return rows.filter(({ person, evaluation }) => {
      if (filters.course !== 'all' && filters.course !== settings.course) return false;
      if (filters.subject !== 'all' && filters.subject !== SUBJECT) return false;
      if (filters.topic !== 'all' && filters.topic !== week.forumTitle) return false;
      if (filters.batch !== 'all' && person.group !== filters.batch) return false;
      if (filters.status !== 'all' && evaluation.status !== filters.status) return false;
      if (!q) return true;
      return [fullName(person), person.email, studentIdOf(person)].some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, filters, settings.course, week.forumTitle]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  if (openId) return <EvaluationView personId={openId} onBack={() => setOpenId(null)} />;

  const weights: [string, number][] = [
    ['Original Post', POST_MAX],
    ...Array.from({ length: RUBRIC.replyCount }, (_, i): [string, number] => [`Peer Reply ${i + 1}`, REPLY_MAX]),
    ['Total Configurable', TOTAL_MAX],
  ];

  return (
    <div className={styles.view}>
      <ul className={styles.stats} aria-label="Grading summary">
        {stats.map((s) => (
          <li key={s.label} className={styles.stat} data-tone={s.tone}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </li>
        ))}
      </ul>

      <ul className={styles.weights} aria-label="Mark weights">
        {weights.map(([label, value]) => (
          <li key={label} className={styles.weight}>
            {label} : <strong>{value}</strong>
          </li>
        ))}
      </ul>

      <section className={styles.panel} aria-label="Participant grades">
        <div className={styles.topbar}>
          <div className={styles.rubric}>
            <Select
              variant="filter"
              ariaLabel="Rubric"
              value={RUBRIC.id}
              options={[{ value: RUBRIC.id, label: RUBRIC.name }]}
              onChange={() => undefined}
            />
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              onClick={() =>
                exportGradesCsv(
                  filtered.map(({ person, evaluation }) => ({ person, evaluation })),
                  `grades-${week.id}.csv`,
                )
              }
            >
              <DownloadIcon aria-hidden />
              Download
            </button>
            <button type="button" className={`${styles.button} ${styles.save}`} onClick={() => toast.show('All evaluations saved')}>
              Save all
            </button>
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.filter}>
            <Select
              variant="filter"
              ariaLabel="Course"
              value={filters.course}
              options={[
                { value: 'all', label: 'All Courses' },
                { value: settings.course, label: settings.course },
              ]}
              onChange={(v) => setFilter('course', v)}
            />
          </div>
          <div className={styles.filter}>
            <Select
              variant="filter"
              ariaLabel="Subject"
              value={filters.subject}
              options={[
                { value: 'all', label: 'All Subjects' },
                { value: SUBJECT, label: SUBJECT },
              ]}
              onChange={(v) => setFilter('subject', v)}
            />
          </div>
          <div className={styles.filter}>
            <Select
              variant="filter"
              ariaLabel="Topic"
              value={filters.topic}
              options={[
                { value: 'all', label: 'All Topics' },
                { value: week.forumTitle, label: week.forumTitle },
              ]}
              onChange={(v) => setFilter('topic', v)}
            />
          </div>
          <div className={styles.filter}>
            <Select
              variant="filter"
              ariaLabel="Batch"
              value={filters.batch}
              options={[{ value: 'all', label: 'All batches' }, ...GROUPS.map((g) => ({ value: g, label: g }))]}
              onChange={(v) => setFilter('batch', v)}
            />
          </div>
          <div className={styles.filter}>
            <Select
              variant="filter"
              ariaLabel="Status"
              value={filters.status}
              options={STATUS_OPTIONS}
              onChange={(v) => setFilter('status', v as StatusFilter)}
            />
          </div>
          <label className={styles.search}>
            <Search size={20} strokeWidth={1.5} aria-hidden />
            <span className="sr-only">Search participants</span>
            <input
              type="search"
              placeholder="Search"
              value={filters.query}
              onChange={(e) => setFilter('query', e.target.value)}
            />
          </label>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Student Id</th>
                <th scope="col">Participant</th>
                <th scope="col">Group</th>
                <th scope="col">Discussion Topic</th>
                <th scope="col" className={styles.center}>Peers Replies</th>
                <th scope="col" className={styles.center}>Total marks</th>
                <th scope="col" className={styles.center}>Status</th>
                <th scope="col" className={styles.center}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.empty}>
                    No participants match these filters.
                  </td>
                </tr>
              ) : (
                visible.map(({ person, index, evaluation, scores, progress }) => {
                  const meta = EVALUATION_STATUS_META[evaluation.status];
                  return (
                    <tr key={person.id} className={styles.row}>
                      <td data-label="Student Id" className={styles.id}>
                        {studentIdOf(person)}
                      </td>
                      <th scope="row" className={styles.participant}>
                        <span
                          className={styles.avatar}
                          style={{ color: AVATAR_TONES[index % AVATAR_TONES.length] }}
                          aria-hidden
                        >
                          {initialsFor(person)}
                        </span>
                        {displayName(person)}
                      </th>
                      <td data-label="Group" className={styles.group}>
                        {person.group || '-'}
                      </td>
                      <td data-label="Discussion Topic" className={styles.topic}>
                        {week.forumTitle}
                      </td>
                      <td data-label="Peers Replies" className={styles.center}>
                        {Math.min(progress.replies, RUBRIC.replyCount)} of {RUBRIC.replyCount}
                      </td>
                      <td data-label="Total marks" className={styles.center}>
                        {evaluation.status === 'pending' ? '—' : `${formatMark(scores.total)}/${TOTAL_MAX}`}
                      </td>
                      <td data-label="Status" className={styles.center}>
                        <StatusPill tone={meta.tone} size="md">
                          {evaluation.status === 'published' && (
                            <CircleCheck size={16} className={styles.checkIcon} aria-hidden />
                          )}
                          {meta.label}
                        </StatusPill>
                      </td>
                      <td data-label="Actions" className={styles.center}>
                        <button
                          type="button"
                          className={styles.action}
                          data-tone={meta.actionTone}
                          aria-label={`${meta.action} ${fullName(person)}`}
                          onClick={() => setOpenId(person.id)}
                        >
                          {meta.action}
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

      <Pagination page={current} pageCount={pageCount} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />

      <Toast message={toast.message} />
    </div>
  );
}