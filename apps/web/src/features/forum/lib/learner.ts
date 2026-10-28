export type LearnerTabKey = "forum" | "progress" | "grades" | "alerts";

export const LEARNER_TABS: { key: LearnerTabKey; label: string }[] = [
  { key: "forum", label: "Forum" },
  { key: "progress", label: "Progress" },
  { key: "grades", label: "Grades" },
  { key: "alerts", label: "Alerts" },
];

export type TopicStatus = "open" | "pinned" | "answered" | "locked" | "notice";
export type ReplyNeeded = "required" | "optional" | null;
export type TopicFilter = "all" | "unread" | "pinned" | "answered" | "mine";
export type TopicSort = "latest" | "replies" | "oldest" | "az";
export type PostType = "topic" | "reply";

export interface LearnerTopic {
  id: string;
  title: string;
  createdBy: string;
  group: string;
  replies: number;
  lastActivityHours: number;
  createdHours: number;
  status: TopicStatus;
  replyNeeded: ReplyNeeded;
  mine: boolean;
  unread: boolean;
  reportCount?: number;
}

export interface MyPost {
  id: string;
  title: string;
  type: PostType;
  date: string;
  words: number;
}

export interface LearnerSummary {
  myTopics: { done: number; total: number };
  myReplies: { done: number; total: number };
  timeLeft: string;
  dueIn: string;
  status: string;
}

export interface NewTopicInput {
  title: string;
  message: string;
  group: string;
  subscribe: boolean;
  notify: boolean;
  files: File[];
}

export const LEARNER_SUMMARY: LearnerSummary = {
  myTopics: { done: 1, total: 1 },
  myReplies: { done: 1, total: 2 },
  timeLeft: "1d 4h",
  dueIn: "1 d 4h",
  status: "Pending",
};

export const ATTACH_RULES: { types: string[]; maxSizeMb: number; maxFiles: number } = {
  types: ["pdf", "docx", "png"],
  maxSizeMb: 5,
  maxFiles: 3,
};

export const LEARNER_GROUPS: { value: string; label: string }[] = [
  { value: "all", label: "All Groups" },
  { value: "Group A", label: "Group A" },
  { value: "Group B", label: "Group B" },
];

export const FORM_GROUP_OPTIONS: { value: string; label: string }[] = [
  { value: "Group A", label: "Group A" },
  { value: "Group B", label: "Group B" },
];

export const SUBJECT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Select subject" },
  { value: "tree-basics", label: "Tree basics" },
  { value: "bst", label: "Binary search trees" },
  { value: "traversals", label: "Tree traversals" },
  { value: "heaps", label: "Heaps and priority queues" },
  { value: "real-world", label: "Trees in real-world apps" },
  { value: "general", label: "General question" },
];

export const TOPIC_FILTERS: { value: TopicFilter; label: string }[] = [
  { value: "all", label: "All topics" },
  { value: "unread", label: "Unread" },
  { value: "pinned", label: "Pinned" },
  { value: "answered", label: "Answered" },
  { value: "mine", label: "Mine" },
];

export const TOPIC_SORTS: { value: TopicSort; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "replies", label: "Most replies" },
  { value: "oldest", label: "Oldest" },
  { value: "az", label: "A–Z" },
];

export const TOPIC_STATUS_LABEL: Record<TopicStatus, string> = {
  open: "Open",
  pinned: "Pinned",
  answered: "Answered",
  locked: "Locked",
  notice: "Notice",
};

export const POST_TYPE_LABEL: Record<PostType, string> = {
  topic: "Topic",
  reply: "Reply",
};

export const LEARNER_EXPORT_SECTIONS: { value: string; label: string }[] = [
  { value: "myPosts", label: "My Posts" },
  { value: "feedbacks", label: "Feedbacks" },
  { value: "myGrade", label: "My grade" },
];

export const LEARNER_TOPICS: LearnerTopic[] = [
  { id: "t-1", title: "Best for a playlist app?", createdBy: "Priya. N", group: "Group A", replies: 12, lastActivityHours: 2, createdHours: 120, status: "pinned", replyNeeded: "required", mine: false, unread: true },
  { id: "t-2", title: "Insertion time complexity", createdBy: "Karan. M", group: "Group A", replies: 8, lastActivityHours: 5, createdHours: 96, status: "answered", replyNeeded: "required", mine: false, unread: false },
  { id: "t-3", title: "Pointer memory overhead", createdBy: "Sara. L", group: "Group B", replies: 5, lastActivityHours: 24, createdHours: 72, status: "pinned", replyNeeded: "optional", mine: false, unread: true },
  { id: "t-4", title: "Singly vs doubly linked", createdBy: "Imran. T", group: "Group B", replies: 3, lastActivityHours: 48, createdHours: 150, status: "locked", replyNeeded: "optional", mine: false, unread: false, reportCount: 1 },
  { id: "t-5", title: "Share your example", createdBy: "Dr. A Rao", group: "Group A", replies: 0, lastActivityHours: 72, createdHours: 200, status: "notice", replyNeeded: null, mine: false, unread: false },
  { id: "t-6", title: "When to use a heap?", createdBy: "You", group: "Group A", replies: 4, lastActivityHours: 96, createdHours: 110, status: "answered", replyNeeded: "required", mine: true, unread: false },
  { id: "t-7", title: "Recursion depth limits", createdBy: "Priya. N", group: "Group B", replies: 6, lastActivityHours: 120, createdHours: 168, status: "answered", replyNeeded: "optional", mine: false, unread: true },
  { id: "t-8", title: "Hash map collisions", createdBy: "Karan. M", group: "Group A", replies: 2, lastActivityHours: 144, createdHours: 180, status: "pinned", replyNeeded: "optional", mine: false, unread: false },
];

export const MY_POSTS: MyPost[] = [
  { id: "p-1", title: "Best for a playlist app?", type: "topic", date: "2026-10-14", words: 142 },
  { id: "p-2", title: "Re: Time Complexity", type: "reply", date: "2026-10-14", words: 96 },
];