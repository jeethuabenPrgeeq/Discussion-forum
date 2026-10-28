import type { Metadata } from 'next';
import SignInForm from '@/features/auth/SignInForm/SignInForm';

export const metadata: Metadata = {
  title: 'Sign in · Discussion Forum',
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  return <SignInForm next={Array.isArray(next) ? next[0] : next} />;
}