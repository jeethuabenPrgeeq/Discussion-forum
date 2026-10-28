'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LOGIN_PATH, clearSessionCookie } from '@/features/auth/lib/session';

interface SignOutButtonProps {
  className?: string;
  children?: ReactNode;
}

export default function SignOutButton({ className, children = 'Logout' }: SignOutButtonProps) {
  const router = useRouter();

  const signOut = () => {
    clearSessionCookie();
    router.replace(LOGIN_PATH);
    router.refresh();
  };

  return (
    <button type="button" className={className} onClick={signOut}>
      {children}
    </button>
  );
}