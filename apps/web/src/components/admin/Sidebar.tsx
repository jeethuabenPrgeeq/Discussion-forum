"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from 'lucide-react';
import {
  BellIcon,
  ChartUpIcon,
  ClipboardCheckIcon,
  DashboardSquareIcon,
  GraduationCapIcon,
  LogOutIcon,
  TrendingUpIcon,
  UserCheckIcon,
  UserMultipleIcon,
  type IconComponent,
} from '@/components/icons';
import styles from "./Sidebar.module.css";

interface NavItem {
  href: string;
  label: string;
  icon: IconComponent;
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardSquareIcon },
  { href: '/training-operations', label: 'Training Operations', icon: ChartUpIcon },
  { href: '/assessment', label: 'Assessment', icon: ClipboardCheckIcon },
  { href: '/learning', label: 'Learning', icon: GraduationCapIcon },
  { href: '/employee-progress', label: 'Employee Progress', icon: UserMultipleIcon },
  { href: '/attendance', label: 'Attendance', icon: UserCheckIcon },
  { href: '/notifications', label: 'Notification', icon: BellIcon },
  { href: '/training-reports', label: 'Training Reports', icon: TrendingUpIcon },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout?: () => void;
}

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile, onLogout }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside id="app-sidebar" className={styles.sidebar} data-collapsed={collapsed || undefined} data-open={mobileOpen || undefined} aria-label="Main navigation">
      <div className={styles.brand}>
        <Link href="/dashboard" className={styles.logo} aria-label="NeuroLXP home">
          <Image src="/NeuroLXP-Logo.png" alt="" width={208} height={77} priority className={styles.logoFull} />
          <Image src="/NeuroLXP-Logo.png" alt="" width={45} height={44} className={styles.logoMark} />
        </Link>

        <button type="button" className={styles.closeBtn} onClick={onCloseMobile} aria-label="Close menu">
          <X size={20} />
        </button>
      </div>

      <nav className={styles.nav}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} className={styles.item} aria-current={active ? "page" : undefined} title={collapsed ? label : undefined} onClick={onCloseMobile}>
              <Icon strokeWidth={active ? 2 : undefined} className={styles.icon} />
              <span className={styles.label}>{label}</span>
            </Link>
          );
        })}
      </nav>

      <button type="button" className={`${styles.item} ${styles.logout}`} onClick={onLogout} title={collapsed ? "Logout" : undefined}>
        <LogOutIcon className={styles.icon} />
        <span className={styles.label}>Logout</span>
      </button>
    </aside>
  );
}
