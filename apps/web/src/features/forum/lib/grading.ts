import { csvCell, displayName, fullName } from './people';
import type {
  Evaluation,
  EvaluationStatus,
  ForumPerson,
  MarkMap,
  PillTone,
  Rubric,
  RubricCriterion,
} from './types';

export const RUBRIC: Rubric = {
  id: 'rubric-discussion',
  name: 'Rubrics',
  version: 'V2.1 ( Published )',
  precision: 0.5,
  replyCount: 2,
  postCriteria: [
    { id: 'relevance', label: 'Topic Relevance', max: 10 },
    { id: 'knowledge', label: 'Subject Knowledge & Understanding', max: 20 },
    { id: 'thinking', label: 'Critical Thinking & Analysis', max: 15 },
    { id: 'evidence', label: 'Supporting Evidence & Examples', max: 15 },
    { id: 'originality', label: 'Originality & Practical Application', max: 10 },
  ],
  replyCriteria: [
    { id: 'relevance', label: 'Relevance to Discussion', max: 4 },
    { id: 'contribution', label: 'Constructive Contribution', max: 5 },
    { id: 'reasoning', label: 'Reasoning & Evidence', max: 4 },
    { id: 'respect', label: 'Respectful Interaction', max: 2 },
  ],
};

const sumMax = (criteria: RubricCriterion[]) => criteria.reduce((s, c) => s + c.max, 0);

export const POST_MAX = sumMax(RUBRIC.postCriteria);
export const REPLY_MAX = sumMax(RUBRIC.replyCriteria);
export const TOTAL_MAX = POST_MAX + REPLY_MAX * RUBRIC.replyCount;

export const GRADE_SCALE: [number, string][] = [
  [90, 'A'],
  [80, 'B'],
  [70, 'C'],
  [60, 'D'],
  [50, 'E'],
  [0, 'F'],
];

export const gradeFor = (percentage: number) => GRADE_SCALE.find(([min]) => percentage >= min)?.[1] ?? 'F';

export function markError(value: number | null | undefined, max: number, precision = RUBRIC.precision) {
  if (value === null || value === undefined) return null;
  if (value < 0) return "Can't be negative";
  if (value > max) return `Max is ${max}`;
  const steps = value / precision;
  if (Math.abs(steps - Math.round(steps)) > 1e-9) return `Use steps of ${precision}`;
  return null;
}

const sumMarks = (marks: MarkMap, criteria: RubricCriterion[]) =>
  criteria.reduce((s, c) => s + (marks[c.id] ?? 0), 0);

const isFilled = (marks: MarkMap, criteria: RubricCriterion[]) =>
  criteria.every((c) => typeof marks[c.id] === 'number');

const hasError = (marks: MarkMap, criteria: RubricCriterion[]) =>
  criteria.some((c) => markError(marks[c.id], c.max) !== null);

export interface Scores {
  post: number;
  replies: number[];
  total: number;
  percentage: number;
  grade: string | null;
  complete: boolean;
  valid: boolean;
}

export function scoresOf(e: Evaluation): Scores {
  const { postCriteria, replyCriteria } = RUBRIC;
  const post = sumMarks(e.postMarks, postCriteria);
  const replies = e.replyMarks.map((m) => sumMarks(m, replyCriteria));
  const total = post + replies.reduce((a, b) => a + b, 0);
  const complete = isFilled(e.postMarks, postCriteria) && e.replyMarks.every((m) => isFilled(m, replyCriteria));
  const valid = !hasError(e.postMarks, postCriteria) && !e.replyMarks.some((m) => hasError(m, replyCriteria));
  const percentage = Math.round((total / TOTAL_MAX) * 100);
  return { post, replies, total, percentage, grade: complete && valid ? gradeFor(percentage) : null, complete, valid };
}

export const formatMark = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const fill = (criteria: RubricCriterion[], values: (number | null)[] = []): MarkMap =>
  Object.fromEntries(criteria.map((c, i) => [c.id, values[i] ?? null]));

export function emptyEvaluation(person: ForumPerson): Evaluation {
  const submittedReplies = person.posts.filter((p) => p.kind === 'reply').length;
  const postMissing = !person.posts.some((p) => p.kind === 'topic');
  const replyMissing = Array.from({ length: RUBRIC.replyCount }, (_, i) => i >= submittedReplies);
  const zeros = (criteria: RubricCriterion[]) => fill(criteria, criteria.map(() => 0));
  return {
    personId: person.id,
    status: 'pending',
    postMissing,
    postMarks: postMissing ? zeros(RUBRIC.postCriteria) : fill(RUBRIC.postCriteria),
    postFeedback: {},
    replyMissing,
    replyMarks: replyMissing.map((missing) =>
      missing ? zeros(RUBRIC.replyCriteria) : fill(RUBRIC.replyCriteria),
    ),
    replyFeedback: replyMissing.map(() => ''),
    overallFeedback: '',
    improvement: '',
    evaluator: 'Dr. A. Rao',
    evaluatedOn: '',
    audit: [],
  };
}

const PRESETS: Record<string, Partial<Evaluation>> = {
  'person-1': {
    status: 'published',
    postMarks: fill(RUBRIC.postCriteria, [9, 19, 13, 14, 9]),
    postFeedback: { relevance: 'Good start. Add cache locality.' },
    replyMarks: [fill(RUBRIC.replyCriteria, [4, 5, 4, 2]), fill(RUBRIC.replyCriteria, [3, 5, 4, 2])],
    overallFeedback: '<p>Strong comparison with clear examples.</p>',
    improvement: '<p>Add cache locality.</p>',
    evaluatedOn: '2026-10-15',
    audit: [{ at: '2026-10-15T09:00:00.000Z', by: 'Admin', action: 'Published marks.' }],
  },
  'person-2': {
    status: 'evaluated',
    postMarks: fill(RUBRIC.postCriteria, [8, 16, 12, 12, 7]),
    replyMarks: [fill(RUBRIC.replyCriteria, [3, 4, 4, 2]), fill(RUBRIC.replyCriteria, [4, 4, 3, 2])],
    evaluatedOn: '2026-10-16',
    audit: [{ at: '2026-10-16T10:30:00.000Z', by: 'Dr. A. Rao', action: 'Submitted evaluation.' }],
  },
  'person-3': {
    status: 'draft',
    postMarks: fill(RUBRIC.postCriteria, [8, 12]),
    audit: [{ at: '2026-10-17T11:15:00.000Z', by: 'Dr. A. Rao', action: 'Saved draft.' }],
  },
};

export function seedEvaluations(people: ForumPerson[]): Record<string, Evaluation> {
  return Object.fromEntries(people.map((p) => [p.id, { ...emptyEvaluation(p), ...PRESETS[p.id] }]));
}

export const EVALUATION_STATUS_META: Record<
  EvaluationStatus,
  { label: string; tone: PillTone; action: string; actionTone: 'blue' | 'orange' | 'dark' }
> = {
  pending: { label: 'Pending', tone: 'red', action: 'Evaluate', actionTone: 'dark' },
  draft: { label: 'Draft', tone: 'orange', action: 'Continue', actionTone: 'orange' },
  evaluated: { label: 'Evaluated', tone: 'outline', action: 'View', actionTone: 'blue' },
  published: { label: 'Published', tone: 'green', action: 'View', actionTone: 'blue' },
};

export const EVALUATOR_OPTIONS = [
  { value: 'Dr. A. Rao', label: 'Dr. A. Rao' },
  { value: 'Antony Thomas', label: 'Antony Thomas' },
];

export function studentIdOf(person: ForumPerson) {
  const n = /^person-(\d+)$/.exec(person.id)?.[1];
  return n ? `S${n.padStart(3, '0')}` : `S-${person.id.slice(0, 4).toUpperCase()}`;
}

export const initialsFor = (p: Pick<ForumPerson, 'firstName' | 'lastName'>) =>
  `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase();

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const two = (n: number) => String(n).padStart(2, '0');

export function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatDateTime(iso: string, joiner = ', ') {
  const d = new Date(iso);
  return `${formatDate(iso)}${joiner}${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`;
}

export function formatNumericDate(iso: string) {
  const d = new Date(iso);
  return `${two(d.getUTCDate())}-${two(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
}

export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

const PRIYA_POST =
  'Linked lists win for a playlist app: inserting a song in the middle is O(1) once you hold the node, while an array must shift every element after it. The trade-off is extra memory for pointers and weaker cache locality, so I would still use an array for a fixed, read-heavy list.';

const PRIYA_REPLIES = [
  'Good point on insertion. A doubly linked list also makes "previous song" O(1).',
  'Agreed on cache locality, but for a playlist of a few thousand songs the difference is hard to notice.',
];

export interface Submission {
  post: { text: string; submittedAt: string } | null;
  replies: ({ to: string; text: string; submittedAt: string } | null)[];
}

export function submissionFor(person: ForumPerson, people: ForumPerson[]): Submission {
  const topic = person.posts.find((p) => p.kind === 'topic');
  const replyPosts = person.posts.filter((p) => p.kind === 'reply');
  const others = people.filter((p) => p.id !== person.id);
  const isPriya = person.id === 'person-1';

  return {
    post: topic
      ? {
          text: isPriya
            ? PRIYA_POST
            : `${topic.title} - my view is that the right structure depends on how often we insert versus read. I compared both approaches and backed it with one source.`,
          submittedAt: topic.createdAt,
        }
      : null,
    replies: Array.from({ length: RUBRIC.replyCount }, (_, i) => {
      const reply = replyPosts[i];
      if (!reply) return null;
      const to = others[i % Math.max(others.length, 1)];
      return {
        to: to ? displayName(to) : 'a classmate',
        text: isPriya ? PRIYA_REPLIES[i] : `Re: ${reply.title}. I agree with the main point and added one more example.`,
        submittedAt: reply.createdAt,
      };
    }),
  };
}

export const VALIDATION_RULES: [string, string][] = [
  ['Empty marks', 'Allowed in Draft; blocks final submission when a required score is missing.'],
  ['Negative marks', 'Inline error; blocks submission.'],
  ['Above maximum', 'Inline error; blocks submission.'],
  ['Decimal marks', 'Only the rubric precision (steps of 0.5).'],
  ['Automatic calculation', 'Subtotals, total, percentage and grade update live.'],
  ['Final submission', 'Every mandatory criterion is checked first.'],
  ['Feedback', 'Mandatory or optional per rubric configuration.'],
  ['Save draft', 'Keeps partial marks and remarks; learners see nothing.'],
  ['Publish', 'Learners see only finalized, published grades.'],
  ['Edit published grade', 'Needs re-evaluation permission and an audit entry.'],
  ['Participant isolation', 'Only the selected learner, discussion and tenant records show.'],
  ['Version control', 'The rubric version applied is shown on every evaluation.'],
  ['Criterion input', '0 up to the criterion maximum, in the configured precision.'],
  ['Missing replies', 'Shown clearly; the zero-mark or exception policy applies.'],
  ['Rubric source', 'Maximums and criteria come from the assigned, versioned rubric.'],
];

export function exportGradesCsv(rows: { person: ForumPerson; evaluation: Evaluation }[], filename: string) {
  const header = [
    'Student ID',
    'Name',
    'Email',
    'Status',
    `Original Post /${POST_MAX}`,
    ...Array.from({ length: RUBRIC.replyCount }, (_, i) => `Reply ${i + 1} /${REPLY_MAX}`),
    `Total /${TOTAL_MAX}`,
    'Percentage',
    'Grade',
  ];
  const lines = rows.map(({ person, evaluation }) => {
    const s = scoresOf(evaluation);
    const pending = evaluation.status === 'pending';
    return [
      studentIdOf(person),
      fullName(person),
      person.email,
      EVALUATION_STATUS_META[evaluation.status].label,
      pending ? '' : formatMark(s.post),
      ...s.replies.map((r) => (pending ? '' : formatMark(r))),
      pending ? '' : formatMark(s.total),
      pending ? '' : `${s.percentage}%`,
      s.grade ?? '',
    ]
      .map(csvCell)
      .join(',');
  });
  const blob = new Blob([`\uFEFF${[header.join(','), ...lines].join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}