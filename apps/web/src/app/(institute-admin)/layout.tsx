import type { ReactNode } from 'react';
import AppShell from '@/components/admin/AppShell';

export default function InstitutionLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}