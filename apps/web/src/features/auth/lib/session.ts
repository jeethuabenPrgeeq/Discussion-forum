import { api } from '@/features/forum/lib/api';

export type Role = 'creator' | 'learner';

export interface SessionUser {
  id: string;
  name: string;
  title: string;
  email: string;
  role: Role;
}

interface ApiUser {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export const SESSION_COOKIE = 'df_session';
const PROFILE_COOKIE = 'df_profile';
export const LOGIN_PATH = '/login';
const REMEMBER_SECONDS = 30 * 24 * 60 * 60;

export const ROLE_HOME: Record<Role, string> = {
  creator: '/forum',
  learner: '/learner/forum',
};

export const ROLE_LABEL: Record<Role, string> = {
  creator: 'Creator',
  learner: 'Learner',
};

export const DEMO_CREDENTIALS: { role: Role; email: string; password: string }[] = [
  { role: 'creator', email: 'antony.thomas@prgeeq.com', password: 'Creator@123' },
  { role: 'learner', email: 'priya.nair@college.edu', password: 'Learner@123' },
];

const toSessionUser = (user: ApiUser): SessionUser => ({
  id: user.id,
  name: user.name,
  title: user.role === 'creator' ? 'Institution admin' : 'Learner',
  email: user.email,
  role: user.role,
});

export async function signIn(email: string, password: string, remember: boolean): Promise<SessionUser> {
  const { user } = await api<{ user: ApiUser }>('/auth/login', {
    method: 'POST',
    json: { email: email.trim(), password, remember },
  });
  const sessionUser = toSessionUser(user);
  writeSessionCookie(sessionUser, remember);
  return sessionUser;
}

export function encodeSession(user: SessionUser): string {
  return `${user.role}.${user.id}`;
}

export function decodeSession(value: string | undefined): { role: Role; userId: string } | null {
  if (!value) return null;
  const [role, userId] = decodeURIComponent(value).split('.');
  if ((role !== 'creator' && role !== 'learner') || !userId) return null;
  return { role, userId };
}

const startsWithSegment = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export function canAccess(role: Role, pathname: string): boolean {
  return role === 'creator' ? startsWithSegment(pathname, '/forum') : startsWithSegment(pathname, '/learner');
}

export function safeRedirect(role: Role, next: string | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return ROLE_HOME[role];
  const pathname = next.split(/[?#]/)[0];
  return canAccess(role, pathname) ? next : ROLE_HOME[role];
}

const readCookie = (name: string) =>
  document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

export function writeSessionCookie(user: SessionUser, remember: boolean) {
  if (typeof document === 'undefined') return;
  const maxAge = remember ? `; Max-Age=${REMEMBER_SECONDS}` : '';
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(encodeSession(user))}; Path=/; SameSite=Lax${maxAge}`;
  document.cookie = `${PROFILE_COOKIE}=${encodeURIComponent(JSON.stringify(user))}; Path=/; SameSite=Lax${maxAge}`;
}

export function clearSessionCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${SESSION_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`;
  document.cookie = `${PROFILE_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`;
  void api('/auth/logout', { method: 'POST', keepalive: true }).catch(() => undefined);
}

export function readSessionUser(): SessionUser | null {
  if (typeof document === 'undefined') return null;
  const session = decodeSession(readCookie(SESSION_COOKIE));
  const raw = readCookie(PROFILE_COOKIE);
  if (!session || !raw) return null;
  try {
    const user = JSON.parse(decodeURIComponent(raw)) as SessionUser;
    return user.id === session.userId && user.role === session.role ? user : null;
  } catch {
    return null;
  }
}