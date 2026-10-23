import StatusPill from '@/features/forum/ui/StatusPill';
import { PERSON_STATUS_META, requiredCount } from '@/features/forum/lib/people';
import type { ForumSettings, PersonStatus } from '@/features/forum/lib/types';
import styles from './StatusLegend.module.css';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function StatusLegend({ settings }: { settings: ForumSettings }) {
  const topics = requiredCount(settings.topicsEach);
  const replies = requiredCount(settings.repliesEach);
  const items: [PersonStatus, string][] = [
    ['completed', `${plural(topics, 'topic')} + ${plural(replies, 'reply').replace('replys', 'replies')} posted`],
    ['in_progress', 'Some posted, goal not reached'],
    ['not_started', 'No posts yet'],
  ];

  return (
    <ul className={styles.legend} aria-label="Progress key">
      {items.map(([status, text]) => (
        <li key={status} className={styles.item}>
          <StatusPill tone={PERSON_STATUS_META[status].tone}>{PERSON_STATUS_META[status].label}</StatusPill>
          <span className={styles.text}>{text}</span>
        </li>
      ))}
    </ul>
  );
}