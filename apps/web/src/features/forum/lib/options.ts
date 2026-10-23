import type { SelectOption } from '@/components/form/Select';
import type { TopicFilterKey, TopicSort } from './types';
import { GROUPS } from './mock';
import type { BulkAction, PersonRole, PersonStatus } from './types';

export const ROLE_OPTIONS: { value: PersonRole; label: string }[] = [
  { value: 'learner', label: 'Learner' },
  { value: 'assistant', label: 'Teaching Assistant' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'observer', label: 'Observer' },
];

export const ROLE_FILTER_OPTIONS: { value: PersonRole | 'all'; label: string }[] = [
  { value: 'all', label: 'All roles' },
  ...ROLE_OPTIONS,
];

export const GROUP_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'No group' },
  ...GROUPS.map((g) => ({ value: g, label: g })),
];

export const GROUP_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All groups' },
  ...GROUP_OPTIONS,
];

export const STATUS_FILTER_OPTIONS: { value: PersonStatus | 'any'; label: string }[] = [
  { value: 'any', label: 'Any status' },
  { value: 'completed', label: 'Completed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'not_started', label: 'Not Started' },
];

export const BULK_ACTION_OPTIONS: { value: BulkAction; label: string }[] = [
  { value: 'add', label: 'Add learners' },
  { value: 'update', label: 'Update existing' },
  { value: 'remove', label: 'Remove listed' },
];

export const TOPIC_FILTER_OPTIONS: SelectOption<TopicFilterKey>[] = [
  { value: 'all', label: 'All Topics' },
  { value: 'unread', label: 'Unread' },
  { value: 'pinned', label: 'Pinned' },
  { value: 'answered', label: 'Answered' },
  { value: 'reported', label: 'Reported' },
];

export const SORT_OPTIONS: SelectOption<TopicSort>[] = [
  { value: 'latest', label: 'Latest' },
  { value: 'replies', label: 'Most Replies' },
  { value: 'newest', label: 'Newest' },
  { value: 'answered', label: 'Answered' },
  { value: 'reported', label: 'Reported' },
];

export const FORUM_SETTING_OPTIONS = {
  name: ['Linked lists vs Arrays', 'Stacks and queues', 'Trees and graphs', 'Sorting method', 'Custom name'],
  course: ['CS201 Data Structure', 'CS305 Algorithms', 'CS210 Databases', 'CS210 Operating System', 'CS330 Network'],
  forumType: ['Q & A Forum', 'Standard Forum', 'Single Discussion', 'One topic each'],
  weekModule: ['Week 1 - Basics', 'Week 2 - Arrays', 'Week 3 - Linked lists', 'Week 4 - Stacks'],
  visibility: ['Show', 'Hide', 'Scheduled'],
  maxFiles: ['0', '1', '3', '4', '5'],
  maxSize: ['1 MB', '5 MB', '10 MB', '15 MB'],
  fileTypes: ['PDF, DOCX, PNG', 'Document', 'Images', 'All'],
  editWindow: ['30 Min', '1 hr', 'None'],
  groupMode: ['None', 'Separate', 'Visible'],
  grouping: ['None', 'Lab Section'],
  restrictBy: ['None', 'Group', 'Grad', 'Completion'],
  gradingType: ['Points', 'Scale', 'None'],
  gradingMethod: ['Rubrics', 'Marking Guide', 'Direct'],
  latePenalty: ['None', '10% per day'],
  track: ['When Rules Met', 'Manual', 'Off'],
  needPost: ['1+2', '1+3', '2+2'],
  subscription: ['Auto', 'Forced', 'No', 'Off'],
  digest: ['None', 'Daily', 'Weekly'],
  notifyMeOn: ['Every post', 'Reports only', 'Digest'],
} as const;

export const PEOPLE_OPTIONS = {
  roles: ['All Roles', 'Learner', 'Auditor'],
  status: ['Any Status', 'Complete', 'In Progress', 'Not Started'],
  action: ['Send Reminder', 'Message', 'Change Group', 'Change Role', 'Remove'],
  learners: ['All Learners', 'To grade', 'Graded'],
} as const;

export const COUNT_OPTIONS = ['01', '02', '03', '04', '05'] as const;