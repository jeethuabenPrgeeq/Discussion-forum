'use client';

import BackLink from '@/components/ui/BackLink';
import DropdownMenu from '@/components/ui/DropdownMenu';
import type { ForumTopic } from '@/features/forum/lib/types';
import styles from './ThreadToolbar.module.css';

interface ThreadToolbarProps {
  backHref: string;
  topic: ForumTopic;
  onTogglePin: () => void;
  onToggleLock: () => void;
  onDeleteTopic: () => void;
  onGrade: () => void;
}

export default function ThreadToolbar({ backHref, topic, onTogglePin, onToggleLock, onDeleteTopic, onGrade }: ThreadToolbarProps) {
  return (
    <div className={styles.bar}>
      <BackLink href={backHref} label="Topics" />
      <div className={styles.menus}>
        <DropdownMenu
          label="Actions"
          items={[
            { key: 'pin', label: topic.isPinned ? 'Unpin topic' : 'Pin topic', onSelect: onTogglePin },
            { key: 'lock', label: topic.isLocked ? 'Unlock topic' : 'Lock topic', onSelect: onToggleLock },
            { key: 'delete', label: 'Delete topic', tone: 'danger', onSelect: onDeleteTopic },
          ]}
        />
        <DropdownMenu
          label="Grade"
          items={[
            { key: 'grade', label: 'Grade participants', onSelect: onGrade },
            { key: 'rubric', label: 'View rubric', onSelect: onGrade },
          ]}
        />
      </div>
    </div>
  );
}