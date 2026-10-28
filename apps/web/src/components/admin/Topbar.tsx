'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import { readSessionUser, type SessionUser } from '@/features/auth/lib/session';
import styles from './Topbar.module.css';

interface TopbarProps {
  menuOpen: boolean;
  onOpenMenu: () => void;
  userName?: string;
  userRole?: string;
  avatarSrc?: string;
  unread?: number;
}

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

export default function Topbar({ menuOpen, onOpenMenu, userName, userRole, avatarSrc }: TopbarProps) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUser(readSessionUser());
  }, []);

  const name = userName ?? user?.name ?? '';
  const role = userRole ?? user?.title ?? '';

  return (
    <header className={styles.topbar}>
      <button
        type="button"
        className={styles.menuBtn}
        onClick={onOpenMenu}
        aria-label="Open menu"
        aria-controls="app-sidebar"
        aria-expanded={menuOpen}
      >
        <Menu size={22} />
      </button>

      <div className={styles.right}>
        <NotificationBell buttonClassName={styles.bell} dotClassName={styles.dot} />

        <div className={styles.profile}>
          <span className={styles.avatar}>
            {avatarSrc ? (
              <Image src={avatarSrc} alt="" width={36} height={36} />
            ) : (
              <span className={styles.initials} data-role={user?.role} aria-hidden>
                {initialsOf(name)}
              </span>
            )}
          </span>
          <span className={styles.who}>
            <span className={styles.name}>{name}</span>
            <span className={styles.role}>{role}</span>
          </span>
        </div>
      </div>
    </header>
  );
}