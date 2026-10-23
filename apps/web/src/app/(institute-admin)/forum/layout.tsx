import type { ReactNode } from 'react';
import { ForumProvider } from '@/features/forum/lib/store';
import ForumShell from '@/features/forum/ForumShell/ForumShell';

export default function ForumLayout({ children }: { children: ReactNode }) {
  return (
    <ForumProvider>
      <ForumShell>{children}</ForumShell>
    </ForumProvider>
  );
}