export type TopicState = "open" | "answered" | "notice";
export type TopicStatus = TopicState | "pinned" | "locked";
export type Participation = "required" | "optional" | null;
export type TopicSort = "latest" | "replies" | "newest" | "answered" | "reported";
export type ForumTabKey = "forum" | "settings" | "people" | "grades" | "reports" | "access";
export type AuthorRole = "learner" | "instructor" | "admin";
export type Accent = "red" | "blue" | "purple" | "green" | "orange";
export type TopicKind = 'discussion' | 'question' | 'notice';
export type TopicFilterKey = "all" | "unread" | "pinned" | "answered" | "reported";

export interface ForumWeek {
  id: string;
  label: string;
  forumTitle: string;
}

export interface ForumTopic {
  id: string;
  title: string;
  createdBy: string;
  replies: number;
  lastActivityAt: string;
  state: TopicState;
  isPinned: boolean;
  isLocked: boolean;
  participation: Participation;
  group: string;
  kind?: TopicKind;
  replyBy?: string;
  lockAfterDue?: boolean;
  isGraded?: boolean;
  createdAt?: string;
  isUnread?: boolean;
  reportCount?: number;
}

export interface ForumAuthor {
  id: string;
  name: string;
  role: AuthorRole;
  accent: Accent;
}

export interface ForumAttachment {
  name: string;
  size: number;
}

export interface ForumPost {
  id: string;
  topicId: string;
  author: ForumAuthor;
  body: string;
  createdAt: string;
  editedAt?: string;
  isBestAnswer: boolean;
  isPrivate: boolean;
  replyToId?: string;
  feedback?: string;
  attachments: ForumAttachment[];
}

export interface ForumDeadlines {
  postDue: string;
  repliesDue: string;
  cutoff: string;
  gradesOut: string;
}

export interface ForumDetail {
  id: string;
  title: string;
  course: string;
  forumType: string;
  points: number;
  gradingMode: string;
  instructor: string;
  isLive: boolean;
  postedCount: number;
  totalCount: number;
  reportedCount: number;
  deadlines: ForumDeadlines;
}

export interface ForumStats {
  topics: number;
  posts: number;
  active: string;
  reported: number;
}

export interface TopicFilters {
  query: string;
  group: string;
  status: TopicFilterKey;
  sort: TopicSort;
}

export interface ForumSettings {
  name: string;
  course: string;
  forumType: string;
  weekModule: string;
  about: string;
  goals: string;
  showOnCoursePage: boolean;
  opensAt: string;
  postDue: string;
  repliesDue: string;
  cutoff: string;
  gradeBy: string;
  visibility: string;
  maxFiles: number;
  maxSize: string;
  fileTypes: string;
  showWordCount: boolean;
  minWords: number;
  editWindow: string;
  topicsEach: string;
  repliesEach: string;
  learnersStartTopics: boolean;
  postFirstThenRead: boolean;
  anonymousPosts: boolean;
  groupMode: string;
  grouping: string;
  restrictBy: string;
  gradingType: string;
  maxGrade: number;
  gradingMethod: string;
  passMark: number;
  anonymousGrading: boolean;
  latePenalty: string;
  track: string;
  needGrade: boolean;
  needPosts: string;
  expectedBy: string;
  subscription: string;
  digest: string;
  notifyMeOn: string;
}

export type PersonRole = 'learner' | 'assistant' | 'instructor' | 'observer';
export type PersonStatus = 'completed' | 'in_progress' | 'not_started';
export type PillTone = 'green' | 'orange' | 'red' | 'outline';
export type PostsSort = 'none' | 'desc' | 'asc';
export type BulkAction = 'add' | 'update' | 'remove';

export interface PersonPost {
  id: string;
  topicId: string;
  kind: 'topic' | 'reply';
  title: string;
  createdAt: string;
  words: number;
}

export interface ForumPerson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: PersonRole;
  group: string | null;
  grade: number | null;
  canPost: boolean;
  reminder: boolean;
  accessStarts: string;
  accessEnds: string;
  posts: PersonPost[];
}

export interface PeopleFilters {
  query: string;
  role: PersonRole | 'all';
  group: string;
  status: PersonStatus | 'any';
}

export type EvaluationStatus = 'pending' | 'draft' | 'evaluated' | 'published';

export interface RubricCriterion {
  id: string;
  label: string;
  max: number;
}

export interface Rubric {
  id: string;
  name: string;
  version: string;
  precision: number;
  replyCount: number;
  postCriteria: RubricCriterion[];
  replyCriteria: RubricCriterion[];
}

export type MarkMap = Record<string, number | null>;

export interface AuditEntry {
  at: string;
  by: string;
  action: string;
}

export interface Evaluation {
  personId: string;
  status: EvaluationStatus;
  postMissing: boolean;
  postMarks: MarkMap;
  postFeedback: Record<string, string>;
  replyMissing: boolean[];
  replyMarks: MarkMap[];
  replyFeedback: string[];
  overallFeedback: string;
  improvement: string;
  evaluator: string;
  evaluatedOn: string;
  audit: AuditEntry[];
}