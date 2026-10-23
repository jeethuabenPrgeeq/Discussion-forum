'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import Sidebar from '@/components/admin/Sidebar';
import Topbar from '@/components/admin/Topbar';
import styles from './AppShell.module.css';

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <div className={styles.shell} data-collapsed={collapsed || undefined}>
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <button
        type="button"
        className={styles.collapseBtn}
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-controls="app-sidebar"
        aria-expanded={!collapsed}
      >
        <span className={styles.collapseIcon}>
          <ChevronLeft size={16} strokeWidth={2.25} />
        </span>
      </button>
      {mobileOpen && <div className={styles.backdrop} onClick={() => setMobileOpen(false)} aria-hidden="true" />}
      <div className={styles.main}>
        <Topbar menuOpen={mobileOpen} onOpenMenu={() => setMobileOpen(true)} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}