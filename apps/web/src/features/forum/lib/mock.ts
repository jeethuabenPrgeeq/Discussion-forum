import type {
  ForumAuthor,
  ForumDetail,
  ForumPost,
  ForumSettings,
  ForumTopic,
  ForumWeek,
  Participation,
  TopicState,
  PersonPost,
  ForumPerson
} from './types';

const HOUR = 3_600_000;
export const MOCK_NOW = Date.parse('2026-10-21T10:00:00.000Z');
const hoursAgo = (h: number) => new Date(MOCK_NOW - h * HOUR).toISOString();

export const WEEKS: ForumWeek[] = [
  { id: 'w1', label: 'Week 1 - Arrays', forumTitle: 'Arrays in Practice' },
  { id: 'w2', label: 'Week 2 - Stacks', forumTitle: 'Stacks Everywhere' },
  { id: 'w3', label: 'Week 3 - Linked List', forumTitle: 'Linking It Together' },
  { id: 'w4', label: 'Week 4 - Trees', forumTitle: 'Trees in the Wild' },
];

export const GROUPS = ['Group A', 'Group B'];

export const CURRENT_USER: ForumAuthor = { id: 'u-antony', name: 'Antony Thomas', role: 'admin', accent: 'blue' };

type Seed = [string, string, number, number, TopicState, boolean, boolean, Participation];

const SEED: Seed[] = [
  ['Best for a playlist app?', 'Priya. N', 12, 2, 'open', true, false, 'required'],
  ['Insertion time complexity', 'Karan. M', 8, 5, 'answered', false, false, 'required'],
  ['Pointer memory overhead', 'Sara. L', 5, 24, 'open', true, false, 'optional'],
  ['Singly vs doubly linked', 'Imran. T', 3, 48, 'open', false, true, 'optional'],
  ['Share your example', 'Dr. A Rao', 0, 72, 'notice', false, false, null],
  ['BST vs AVL for lookups', 'Meera. K', 9, 80, 'answered', false, false, 'required'],
  ['When is a heap a tree?', 'Arjun. S', 4, 96, 'open', false, false, 'optional'],
  ['Recursion depth limits', 'Neha. P', 7, 110, 'answered', false, false, 'required'],
  ['Level-order traversal edge cases', 'Rahul. V', 2, 130, 'open', false, false, 'optional'],
  ['Trie for autocomplete', 'Fatima. Z', 11, 150, 'answered', false, false, 'required'],
  ['Balancing after deletion', 'Vikram. R', 6, 170, 'open', false, true, 'optional'],
  ['Red-black tree intuition', 'Ananya. B', 10, 190, 'answered', false, false, 'required'],
  ['Inorder without recursion', 'Kiran. D', 1, 210, 'open', false, false, 'optional'],
  ['Segment tree use cases', 'Rohit. G', 3, 230, 'open', false, false, 'optional'],
  ['Tree height vs depth', 'Divya. M', 5, 250, 'answered', false, false, 'required'],
  ['Serializing a binary tree', 'Aditya. J', 4, 270, 'open', false, false, 'optional'],
  ['Lowest common ancestor', 'Sneha. T', 8, 290, 'answered', false, false, 'required'],
  ['B-trees in databases', 'Dr. A Rao', 0, 310, 'notice', false, false, null],
  ['Count leaf nodes', 'Manoj. H', 2, 330, 'open', false, false, 'optional'],
];

const TREE_TOPICS: ForumTopic[] = SEED.map(
  ([title, createdBy, replies, hours, state, isPinned, isLocked, participation], i) => ({
    id: `t-${i + 1}`,
    title,
    createdBy,
    replies,
    lastActivityAt: hoursAgo(hours),
    createdAt: hoursAgo(hours + 12 + (i % 5) * 18),
    state,
    isPinned,
    isLocked,
    participation,
    group: GROUPS[i % GROUPS.length],
    isUnread: i % 4 === 1,
    reportCount: i === 3 || i === 10 ? 1 : 0,
  }),
);

export function seedTopicsByWeek(): Record<string, ForumTopic[]> {
  return Object.fromEntries(
    WEEKS.map((w): [string, ForumTopic[]] => [w.id, w.id === 'w4' ? TREE_TOPICS : []]),
  );
}

const ACCENTS: ForumAuthor['accent'][] = ['red', 'purple', 'green', 'orange'];

function authorFor(name: string, index: number): ForumAuthor {
  const isInstructor = /^dr\b/i.test(name);
  return {
    id: `u-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`,
    name,
    role: isInstructor ? 'instructor' : 'learner',
    accent: isInstructor ? 'blue' : ACCENTS[index % ACCENTS.length],
  };
}

const PRIYA: ForumAuthor = { id: 'u-priya', name: 'Priya N', role: 'learner', accent: 'red' };
const RAO: ForumAuthor = { id: 'u-rao', name: 'Dr. A. Rao', role: 'instructor', accent: 'blue' };
const KARAN: ForumAuthor = { id: 'u-karan', name: 'Karan M', role: 'learner', accent: 'purple' };

const makePost = (id: string, topicId: string, author: ForumAuthor, body: string, createdAt: string): ForumPost => ({
  id,
  topicId,
  author,
  body,
  createdAt,
  isBestAnswer: false,
  isPrivate: false,
  attachments: [],
});

export function seedPostsByTopic(): Record<string, ForumPost[]> {
  return Object.fromEntries(
    TREE_TOPICS.map((t, i): [string, ForumPost[]] => {
      if (t.id === 't-1') {
        return [
          t.id,
          [
            makePost(
              'p-1',
              t.id,
              PRIYA,
              'Arrays win on random access. A playlist inserts and removes often, so linked lists skip the shifting.',
              hoursAgo(2),
            ),
            makePost('p-2', t.id, RAO, 'Good Start! add cache locality and one source', hoursAgo(2)),
            makePost('p-3', t.id, KARAN, 'Agreed, but dynamic arrays appeared in O(1) amortised', hoursAgo(2)),
          ],
        ];
      }
      return [
        t.id,
        [
          makePost(
            `p-${t.id}-1`,
            t.id,
            authorFor(t.createdBy, i),
            `Starting a thread on “${t.title}”. Share your reasoning and back it with one source.`,
            t.lastActivityAt,
          ),
        ],
      ];
    }),
  );
}

export function getSubjectSuggestions(week: ForumWeek): string[] {
  const topic = week.label.split(' - ')[1] ?? week.label;
  return [
    `Where have you seen ${topic} in real apps?`,
    `${topic}: trade-offs and when to use them`,
    `Common mistakes with ${topic}`,
    `Share your ${topic.toLowerCase()} example`,
  ];
}

export function getDefaultSettings(week: ForumWeek): ForumSettings {
  return {
    name: 'Linked lists vs Arrays',
    course: 'CS201 Data Structure',
    forumType: 'Q & A Forum',
    weekModule: 'Week 3 - Linked lists',
    about: '<p>Compare both, back it with evidence.</p>',
    goals: '',
    showOnCoursePage: true,
    opensAt: '2026-10-14T09:00',
    postDue: '2026-10-18T23:59',
    repliesDue: '2026-10-22T23:59',
    cutoff: '2026-10-25T23:59',
    gradeBy: '2026-10-28T23:59',
    visibility: week.id === 'w4' ? 'Show' : 'Hide',
    maxFiles: 3,
    maxSize: '5 MB',
    fileTypes: 'PDF, DOCX, PNG',
    showWordCount: true,
    minWords: 100,
    editWindow: '30 Min',
    topicsEach: '01',
    repliesEach: '02',
    learnersStartTopics: true,
    postFirstThenRead: true,
    anonymousPosts: true,
    groupMode: 'Separate',
    grouping: 'None',
    restrictBy: 'None',
    gradingType: 'Points',
    maxGrade: 20,
    gradingMethod: 'Rubrics',
    passMark: 12,
    anonymousGrading: true,
    latePenalty: 'None',
    track: 'When Rules Met',
    needGrade: true,
    needPosts: '1+2',
    expectedBy: '2026-10-28T23:59',
    subscription: 'Auto',
    digest: 'None',
    notifyMeOn: 'Every post',
  };
}

export function getForumDetail(week: ForumWeek, settings: ForumSettings = getDefaultSettings(week)): ForumDetail {
  return {
    id: `forum-${week.id}`,
    title: week.forumTitle,
    course: settings.course,
    forumType: settings.forumType.replace(/\s*&\s*/, '&'),
    points: settings.maxGrade,
    gradingMode: settings.gradingMethod,
    instructor: 'Dr. A Rao',
    isLive: settings.visibility === 'Show',
    postedCount: 5,
    totalCount: 7,
    reportedCount: 2,
    deadlines: {
      postDue: settings.postDue.slice(0, 10),
      repliesDue: settings.repliesDue.slice(0, 10),
      cutoff: settings.cutoff.slice(0, 10),
      gradesOut: settings.gradeBy.slice(0, 10),
    },
  };
}

const POST_WORDS = [110, 70, 90, 110, 133, 120, 96, 145, 84, 102];
const POSTS_BASE = Date.parse('2026-10-14T09:00:00.000Z');

type PersonSeed = [string, string, number, number, number | null];

const PERSON_SEED: PersonSeed[] = [
  ['Priya', 'Nair', 1, 5, 18],
  ['Karan', 'Mehta', 1, 3, 16],
  ['Sara', 'Lewis', 1, 2, 18],
  ['Imran', 'Thomas', 0, 1, 8],
  ['Neha', 'Kapoor', 0, 0, null],
  ['Meera', 'Krishnan', 1, 2, 17],
  ['Arjun', 'Shetty', 1, 1, 12],
  ['Rahul', 'Varma', 0, 2, 10],
  ['Fatima', 'Zaidi', 1, 2, 19],
  ['Vikram', 'Rao', 1, 0, 9],
  ['Ananya', 'Bose', 1, 3, 18],
  ['Kiran', 'Das', 0, 0, null],
  ['Rohit', 'Gupta', 1, 2, 15],
  ['Divya', 'Menon', 1, 2, 16],
  ['Aditya', 'Joshi', 0, 1, 7],
  ['Sneha', 'Thampi', 1, 2, 17],
  ['Manoj', 'Hegde', 0, 0, null],
  ['Lakshmi', 'Iyer', 1, 1, 11],
  ['Joel', 'George', 1, 2, 14],
];

const PRIYA_POSTS: [PersonPost['kind'], string, string][] = [
  ['topic', 'Best for a playlist app?', 't-1'],
  ['reply', 'Best for a playlist app?', 't-1'],
  ['reply', 'Time Complexity', 't-2'],
  ['reply', 'Doubly linked', 't-4'],
  ['reply', 'Cache locality', 't-1'],
  ['reply', 'Playlist idea', 't-1'],
];

const personPost = (
  personId: string,
  n: number,
  kind: PersonPost['kind'],
  title: string,
  topicId: string,
  seed: number,
): PersonPost => ({
  id: `${personId}-post-${n + 1}`,
  topicId,
  kind,
  title,
  createdAt: new Date(POSTS_BASE + n * 3 * HOUR).toISOString(),
  words: POST_WORDS[(seed + n) % POST_WORDS.length],
});

function seedPersonPosts(personId: string, index: number, topics: number, replies: number): PersonPost[] {
  if (index === 0) {
    return PRIYA_POSTS.map(([kind, title, topicId], n) => personPost(personId, n, kind, title, topicId, 0));
  }
  const posts: PersonPost[] = [];
  for (let t = 0; t < topics; t++) {
    const topic = TREE_TOPICS[(index + t) % TREE_TOPICS.length];
    posts.push(personPost(personId, posts.length, 'topic', topic.title, topic.id, index));
  }
  for (let r = 0; r < replies; r++) {
    const topic = TREE_TOPICS[(index + r + 1) % TREE_TOPICS.length];
    posts.push(personPost(personId, posts.length, 'reply', topic.title, topic.id, index));
  }
  return posts;
}

const TREE_PEOPLE: ForumPerson[] = PERSON_SEED.map(([firstName, lastName, topics, replies, grade], i) => {
  const id = `person-${i + 1}`;
  return {
    id,
    firstName,
    lastName,
    email: `${firstName}.${lastName}@college.edu`.toLowerCase(),
    role: 'learner',
    group: GROUPS[i % GROUPS.length],
    grade,
    canPost: true,
    reminder: false,
    accessStarts: '2026-10-14',
    accessEnds: '2026-10-25',
    posts: seedPersonPosts(id, i, topics, replies),
  };
});

export function seedPeopleByWeek(): Record<string, ForumPerson[]> {
  return Object.fromEntries(
    WEEKS.map((w): [string, ForumPerson[]] => [w.id, w.id === 'w4' ? TREE_PEOPLE : []]),
  );
}