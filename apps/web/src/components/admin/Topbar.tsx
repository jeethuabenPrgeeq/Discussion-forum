'use client';

import Image from 'next/image';
import { Menu } from 'lucide-react';
import { NotificationIcon } from '@/components/icons';
import styles from './Topbar.module.css';

interface TopbarProps {
  menuOpen: boolean;
  onOpenMenu: () => void;
  userName?: string;
  userRole?: string;
  avatarSrc?: string;
  unread?: number;
}

export default function Topbar({
  menuOpen,
  onOpenMenu,
  userName = 'Antony Thomas',
  userRole = 'Institution admin',
  avatarSrc = '/avatar-antony.png',
  unread = 1,
}: TopbarProps) {
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
        <button
          type="button"
          className={styles.bell}
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <NotificationIcon />
          {unread > 0 && <span className={styles.dot} />}
        </button>

        <div className={styles.profile}>
          <span className={styles.avatar}>
            <Image src={avatarSrc} alt="" width={36} height={36} />
          </span>
          <span className={styles.who}>
            <span className={styles.name}>{userName}</span>
            <span className={styles.role}>{userRole}</span>
          </span>
        </div>
      </div>
    </header>
  );
}