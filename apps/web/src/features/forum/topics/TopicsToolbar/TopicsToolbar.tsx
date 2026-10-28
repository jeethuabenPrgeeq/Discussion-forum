'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import Select from '@/components/form/Select';
import { DownloadIcon } from '@/components/icons';
import { ExportDialog, type ExportOptions } from '@/features/forum/ui/ExportDialog/ExportDialog';
import { SORT_OPTIONS, TOPIC_FILTER_OPTIONS } from '@/features/forum/lib/options';
import type { TopicFilters } from '@/features/forum/lib/types';
import styles from './TopicsToolbar.module.css';

interface TopicsToolbarProps {
  filters: TopicFilters;
  groups: string[];
  onChange: (next: Partial<TopicFilters>) => void;
  onExport: (options: ExportOptions) => void;
  onNewTopic: () => void;
}

export default function TopicsToolbar({ filters, groups, onChange, onExport, onNewTopic }: TopicsToolbarProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const groupOptions = [{ value: 'all', label: 'All Groups' }, ...groups.map((g) => ({ value: g, label: g }))];

  return (
    <div className={styles.toolbar}>
      <div className={styles.filters}>
        <label className={styles.search}>
          <Search size={20} strokeWidth={1.5} aria-hidden />
          <span className={styles.srOnly}>Search topics</span>
          <input
            type="search"
            placeholder="Search topics"
            value={filters.query}
            onChange={(e) => onChange({ query: e.target.value })}
          />
        </label>

        <Select
          variant="filter"
          label="Group"
          className={styles.selectSlot}
          value={filters.group}
          options={groupOptions}
          onChange={(v) => onChange({ group: v })}
        />
        <Select
          variant="filter"
          label="Topic filter"
          className={styles.selectSlot}
          value={filters.status}
          options={TOPIC_FILTER_OPTIONS}
          onChange={(v) => onChange({ status: v })}
        />
        <Select
          variant="filter"
          label="Sort by"
          className={styles.selectSlot}
          value={filters.sort}
          options={SORT_OPTIONS}
          onChange={(v) => onChange({ sort: v })}
        />
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.export} onClick={() => setExportOpen(true)}>
          <DownloadIcon />
          Export
        </button>
        <button type="button" className={styles.newTopic} onClick={onNewTopic}>
          <Plus size={22} strokeWidth={1.75} />
          New Topic
        </button>
      </div>

      {exportOpen && (
        <ExportDialog groups={groups} onClose={() => setExportOpen(false)} onExport={onExport} />
      )}
    </div>
  );
}