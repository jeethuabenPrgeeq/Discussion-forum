import type { ForumTopic, TopicFilterKey, TopicFilters, TopicSort, TopicStatus } from './types';

export const ALL_GROUPS = 'All groups';

export const STATUS_LABEL: Record<TopicStatus, string> = {
  pinned: 'Pinned',
  answered: 'Answered',
  locked: 'Locked',
  notice: 'Notice',
  open: 'Open',
};

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function statusOf(topic: ForumTopic): TopicStatus {
  if (topic.isLocked) return 'locked';
  if (topic.isPinned) return 'pinned';
  return topic.state;
}

export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

const dayFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export const formatDay = (isoDate: string) => dayFormatter.format(new Date(`${isoDate}T00:00:00Z`));

function matchesStatus(topic: ForumTopic, key: TopicFilterKey) {
  switch (key) {
    case 'unread':
      return !!topic.isUnread;
    case 'pinned':
      return topic.isPinned;
    case 'answered':
      return topic.state === 'answered';
    case 'reported':
      return (topic.reportCount ?? 0) > 0;
    default:
      return true;
  }
}

export function filterTopics(topics: ForumTopic[], filters: TopicFilters) {
  const q = filters.query.trim().toLowerCase();
  const activity = (t: ForumTopic) => Date.parse(t.lastActivityAt);
  const created = (t: ForumTopic) => Date.parse(t.createdAt ?? t.lastActivityAt);
  const byLatest = (a: ForumTopic, b: ForumTopic) => activity(b) - activity(a);

  const comparators: Record<TopicSort, (a: ForumTopic, b: ForumTopic) => number> = {
    latest: byLatest,
    replies: (a, b) => b.replies - a.replies || byLatest(a, b),
    newest: (a, b) => created(b) - created(a),
    answered: (a, b) => Number(b.state === 'answered') - Number(a.state === 'answered') || byLatest(a, b),
    reported: (a, b) => (b.reportCount ?? 0) - (a.reportCount ?? 0) || byLatest(a, b),
  };

  return topics
    .filter(
      (t) =>
        (!q || t.title.toLowerCase().includes(q) || t.createdBy.toLowerCase().includes(q)) &&
        (filters.group === 'all' || t.group === filters.group || t.group === ALL_GROUPS) &&
        matchesStatus(t, filters.status),
    )
    .sort(comparators[filters.sort]);
}

export function exportTopicsCsv(rows: ForumTopic[], filename: string) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ['Topic', 'Created By', 'Replies', 'Last Activity', 'Status', 'Participation', 'Group'];
  const body = rows.map((t) => [
    t.title,
    t.createdBy,
    t.replies,
    t.lastActivityAt,
    STATUS_LABEL[statusOf(t)],
    t.participation ?? '-',
    t.group,
  ]);
  const csv = [header, ...body].map((r) => r.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const TITLES = /^(dr|prof|mr|mrs|ms)\.?$/i;

export function initialsOf(name: string) {
  const parts = name.split(/\s+/).filter((p) => p && !TITLES.test(p));
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}