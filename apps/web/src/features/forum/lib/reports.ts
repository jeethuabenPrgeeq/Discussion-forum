export type ReportStatus = 'pending' | 'resolved';
export type ReportDecision = 'dismiss' | 'hide' | 'remove-warn' | 'remove-deduct';
export type StatTone = 'blue' | 'purple' | 'green' | 'orange';

export interface ReportStat {
  key: string;
  label: string;
  value: string;
  tone: StatTone;
}

export interface PosterActivity {
  name: string;
  posts: number;
}

export interface DecisionOption {
  value: ReportDecision;
  label: string;
  hint: string;
  summary: string;
  effect: string;
  notifiesAuthor: boolean;
}

export interface AuditEntry {
  at: string;
  text: string;
}

export interface ReportResolution {
  decision: ReportDecision;
  note: string;
  notified: string;
}

export interface ReportedPost {
  id: string;
  label: string;
  reporter: string;
  reporterShort: string;
  author: string;
  authorShort: string;
  reason: string;
  weekLabel: string;
  topic: string;
  postedAt: string;
  flaggedOn: string;
  content: string;
  status: ReportStatus;
  resolution?: ReportResolution;
  audit: AuditEntry[];
}

export const REPORT_STATS: ReportStat[] = [
  { key: 'posts', label: 'Posts', value: '26', tone: 'blue' },
  { key: 'learners', label: 'Learners Posted', value: '4 / 5', tone: 'purple' },
  { key: 'replies', label: 'Replies each', value: '3.7', tone: 'green' },
  { key: 'reported', label: 'Reported', value: '2', tone: 'orange' },
  { key: 'avg', label: 'avg grade', value: '14.5', tone: 'orange' },
];

export const POSTER_ACTIVITY: PosterActivity[] = [
  { name: 'Priya N', posts: 6 },
  { name: 'Karan M', posts: 4 },
  { name: 'Sara L', posts: 2 },
  { name: 'Imran T', posts: 1 },
  { name: 'Neha K', posts: 0 },
];

export const REPORT_DECISIONS: DecisionOption[] = [
  {
    value: 'dismiss',
    label: 'Dismiss Report',
    hint: 'Content is fine no action',
    summary: 'Dismiss report',
    effect: 'Report closed. The post stays visible to learners.',
    notifiesAuthor: false,
  },
  {
    value: 'hide',
    label: 'Hide Post',
    hint: 'Hidden from learners. kept for audit',
    summary: 'Hide post',
    effect: 'Post is hidden from learners. The author can edit and repost.',
    notifiesAuthor: true,
  },
  {
    value: 'remove-warn',
    label: 'Remove post + warn',
    hint: 'Delete post and notifies learners',
    summary: 'Remove post + warn',
    effect: 'Post is deleted and the author receives a warning.',
    notifiesAuthor: true,
  },
  {
    value: 'remove-deduct',
    label: 'Remove + deduct marks',
    hint: 'Delete post and flag it in grades',
    summary: 'Remove + deduct marks',
    effect: 'Post is deleted and flagged in grades for a mark deduction.',
    notifiesAuthor: true,
  },
];

export const REPORTED_POSTS: ReportedPost[] = [
  {
    id: 'R-101',
    label: 'off-topic-link',
    reporter: 'Sara L',
    reporterShort: 'Sara L.',
    author: 'Imran T',
    authorShort: 'Imran T.',
    reason: 'Off- topic',
    weekLabel: 'Week 4',
    topic: 'Trees in the Wild',
    postedAt: '16 Oct, 09:30',
    flaggedOn: '16 oct, 2026',
    content: 'Check out this cool sale on sneakers -stop deals example/ offer ,also tress are boring anyway.',
    status: 'pending',
    audit: [
      { at: '16 oct, 9:30', text: 'Reported by sara  | Off topic' },
      { at: '16 Oct, 09:30', text: 'Assigned to Dr. A. Rao' },
    ],
  },
  {
    id: 'R-102',
    label: 'copied text',
    reporter: 'Karan M',
    reporterShort: 'Karan M.',
    author: 'Neha K',
    authorShort: 'Neha K.',
    reason: 'Plagiarism',
    weekLabel: 'Week 4',
    topic: 'Trees in the Wild',
    postedAt: '17 Oct, 14:10',
    flaggedOn: '17 oct, 2026',
    content:
      'A binary search tree keeps every left child smaller and every right child larger, which gives O(log n) lookups when balanced.',
    status: 'resolved',
    resolution: {
      decision: 'remove-deduct',
      note: 'Matches an online article word for word.',
      notified: 'Reporter (Karan M.) and Author (Neha K.)',
    },
    audit: [
      { at: '17 Oct, 14:10', text: 'Reported by karan  | Plagiarism' },
      { at: '17 Oct, 14:10', text: 'Assigned to Dr. A. Rao' },
      { at: '18 Oct, 11:00', text: 'Decision: Remove + deduct marks' },
      { at: '18 Oct, 11:00', text: 'Notified: Reporter (Karan M.) and Author (Neha K.) · report closed' },
    ],
  },
];

export function getDecision(value: ReportDecision): DecisionOption {
  return REPORT_DECISIONS.find((option) => option.value === value) ?? REPORT_DECISIONS[0];
}

export function getNotifiedText(report: ReportedPost, decision: ReportDecision): string {
  const reporter = `Reporter (${report.reporterShort})`;
  return getDecision(decision).notifiesAuthor ? `${reporter} and Author (${report.authorShort})` : reporter;
}

export function formatAuditTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function resolveReport(
  report: ReportedPost,
  decision: ReportDecision,
  note: string,
  at: string,
): ReportedPost {
  const notified = getNotifiedText(report, decision);
  return {
    ...report,
    status: 'resolved',
    resolution: { decision, note: note.trim(), notified },
    audit: [
      ...report.audit,
      { at, text: `Decision: ${getDecision(decision).summary}` },
      { at, text: `Notified: ${notified} · report closed` },
    ],
  };
}