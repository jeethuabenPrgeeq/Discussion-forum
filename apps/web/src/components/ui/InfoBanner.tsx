import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import styles from './InfoBanner.module.css';

interface InfoBannerProps {
  children: ReactNode;
  raised?: boolean;
}

export default function InfoBanner({ children, raised }: InfoBannerProps) {
  return (
    <p className={styles.banner} data-raised={raised || undefined} role="note">
      <Info size={24} strokeWidth={1.5} aria-hidden className={styles.icon} />
      <span>{children}</span>
    </p>
  );
}