import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import styles from './BackLink.module.css';

export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={styles.back}>
      <ArrowLeft size={20} strokeWidth={1.5} aria-hidden />
      {label}
    </Link>
  );
}