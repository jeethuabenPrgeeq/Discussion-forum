import type { ForumStats } from '@/features/forum/lib/types';
import { pad2 } from '@/features/forum/lib/utils';
import styles from './StatCards.module.css';

export default function StatCards({ stats }: { stats: ForumStats }) {
  const items = [
    { label: 'Topics', value: pad2(stats.topics), tone: styles.blue },
    { label: 'Posts', value: pad2(stats.posts), tone: styles.purple },
    { label: 'Active', value: stats.active, tone: styles.green },
    { label: 'Reported', value: pad2(stats.reported), tone: styles.orange },
  ];

  return (
    <dl className={styles.grid}>
      {items.map((item) => (
        <div key={item.label} className={styles.card}>
          <dt className={styles.label}>{item.label}</dt>
          <dd className={`${styles.value} ${item.tone}`}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}