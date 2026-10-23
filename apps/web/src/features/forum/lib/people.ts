import { GROUPS } from './mock';
import { ROLE_OPTIONS } from './options';
import type {
  ForumPerson,
  ForumSettings,
  PeopleFilters,
  PersonRole,
  PersonStatus,
  PillTone,
  PostsSort,
} from './types';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export const PERSON_STATUS_META: Record<PersonStatus, { label: string; tone: PillTone }> = {
  completed: { label: 'Completed', tone: 'green' },
  in_progress: { label: 'In Progress', tone: 'orange' },
  not_started: { label: 'Not Started', tone: 'red' },
};

export interface PersonProgress {
  topics: number;
  replies: number;
  topicsRequired: number;
  repliesRequired: number;
  status: PersonStatus;
}

export const requiredCount = (value: string) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function progressOf(person: ForumPerson, settings: ForumSettings): PersonProgress {
  const topics = person.posts.filter((p) => p.kind === 'topic').length;
  const replies = person.posts.length - topics;
  const topicsRequired = requiredCount(settings.topicsEach);
  const repliesRequired = requiredCount(settings.repliesEach);
  const status: PersonStatus =
    topics >= topicsRequired && replies >= repliesRequired
      ? 'completed'
      : topics + replies === 0
        ? 'not_started'
        : 'in_progress';
  return { topics, replies, topicsRequired, repliesRequired, status };
}

export const displayName = (p: Pick<ForumPerson, 'firstName' | 'lastName'>) =>
  `${p.firstName} ${p.lastName.charAt(0).toUpperCase()}`.trim();

export const fullName = (p: Pick<ForumPerson, 'firstName' | 'lastName'>) => `${p.firstName} ${p.lastName}`.trim();

export const roleLabel = (role: PersonRole) => ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;

export const groupFromOption = (value: string) => (value === 'none' ? null : value);

export function formatShortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function filterPeople(people: ForumPerson[], f: PeopleFilters, settings: ForumSettings) {
  const q = f.query.trim().toLowerCase();
  return people.filter((p) => {
    if (q && !`${p.firstName} ${p.lastName} ${p.email}`.toLowerCase().includes(q)) return false;
    if (f.role !== 'all' && p.role !== f.role) return false;
    if (f.group !== 'all' && (f.group === 'none' ? p.group !== null : p.group !== f.group)) return false;
    if (f.status !== 'any' && progressOf(p, settings).status !== f.status) return false;
    return true;
  });
}

export function sortPeopleByPosts(people: ForumPerson[], sort: PostsSort) {
  if (sort === 'none') return people;
  const dir = sort === 'desc' ? -1 : 1;
  return [...people].sort((a, b) => (a.posts.length - b.posts.length) * dir);
}

export interface PersonInput {
  firstName: string;
  lastName: string;
  email: string;
  role: PersonRole;
  group: string | null;
}

export function createPerson(input: PersonInput, settings: ForumSettings): ForumPerson {
  return {
    id: crypto.randomUUID(),
    ...input,
    grade: null,
    canPost: true,
    reminder: false,
    accessStarts: settings.opensAt.slice(0, 10),
    accessEnds: settings.cutoff.slice(0, 10),
    posts: [],
  };
}

export interface ParsedPersonRow {
  firstName: string;
  lastName: string;
  email: string;
  role?: PersonRole;
  group?: string | null;
}

export interface ParsedPeople {
  rows: ParsedPersonRow[];
  errors: string[];
}

type HeaderKey = 'firstName' | 'lastName' | 'email' | 'role' | 'group' | 'name';

const HEADER_KEYS: Record<string, HeaderKey> = {
  firstname: 'firstName',
  first: 'firstName',
  givenname: 'firstName',
  lastname: 'lastName',
  last: 'lastName',
  surname: 'lastName',
  email: 'email',
  emailaddress: 'email',
  mail: 'email',
  role: 'role',
  group: 'group',
  name: 'name',
  fullname: 'name',
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        cell += c;
      }
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim()));
}

function parseRole(value: string): PersonRole | undefined {
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  return ROLE_OPTIONS.find((o) => o.value === v || o.label.toLowerCase() === v)?.value;
}

function parseGroup(value: string): string | null | undefined {
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  if (v === 'none' || v === 'no group') return null;
  return GROUPS.find((g) => g.toLowerCase() === v);
}

export function parsePeopleCsv(text: string, maxRows = 500): ParsedPeople {
  const table = parseCsv(text.replace(/^\uFEFF/, ''));
  if (table.length < 2) return { rows: [], errors: ['The file needs a header row and at least one person.'] };

  const header = table[0].map((h) => HEADER_KEYS[h.toLowerCase().replace(/[^a-z]/g, '')]);
  if (!header.includes('email')) return { rows: [], errors: ['Missing an "email" column.'] };
  if (!header.includes('firstName') && !header.includes('name')) {
    return { rows: [], errors: ['Missing a "first_name" or "name" column.'] };
  }

  const rows: ParsedPersonRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  if (table.length - 1 > maxRows) errors.push(`Only the first ${maxRows} rows were read.`);

  table.slice(1, maxRows + 1).forEach((cells, i) => {
    const line = i + 2;
    const get = (key: HeaderKey) => {
      const idx = header.indexOf(key);
      return idx >= 0 ? (cells[idx] ?? '').trim() : '';
    };
    let firstName = get('firstName');
    let lastName = get('lastName');
    if (!firstName && get('name')) {
      const [first, ...rest] = get('name').split(/\s+/);
      firstName = first;
      lastName ||= rest.join(' ');
    }
    const email = get('email').toLowerCase();
    if (!firstName) {
      errors.push(`Row ${line}: missing first name.`);
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      errors.push(`Row ${line}: "${email || 'blank'}" is not a valid email.`);
      return;
    }
    if (seen.has(email)) {
      errors.push(`Row ${line}: ${email} appears more than once.`);
      return;
    }
    seen.add(email);
    rows.push({ firstName, lastName, email, role: parseRole(get('role')), group: parseGroup(get('group')) });
  });

  return { rows, errors };
}

export const csvCell = (value: string | number) => {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportPeopleCsv(people: ForumPerson[], settings: ForumSettings, filename: string) {
  const header = ['Name', 'Email', 'Role', 'Group', 'Topics started', 'Replies made', 'Status', 'Grade', 'Posts'];
  const lines = people.map((p) => {
    const pr = progressOf(p, settings);
    return [
      fullName(p),
      p.email,
      roleLabel(p.role),
      p.group ?? 'No group',
      `${pr.topics} of ${pr.topicsRequired}`,
      `${pr.replies} of ${pr.repliesRequired}`,
      PERSON_STATUS_META[pr.status].label,
      p.grade === null ? '' : `${p.grade}/${settings.maxGrade}`,
      p.posts.length,
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