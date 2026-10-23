"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";
import { pad2 } from "@/features/forum/lib/utils";
import styles from "./Pagination.module.css";

interface PaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, pageCount, pageSize, total, onChange }: PaginationProps) {
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={styles.bar}>
      <p className={styles.summary} aria-live="polite">
        Showing {pad2(from)} to {pad2(to)} of {pad2(total)}
      </p>

      {total > 0 && (
        <nav className={styles.pager} aria-label="Topics pagination">
          <button type="button" className={styles.arrow} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
            <ArrowLeftIcon />
          </button>

          <span className={styles.page} aria-current="page" aria-label={`Page ${page} of ${pageCount}`}>
            {page}
          </span>

          <button type="button" className={styles.arrow} disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Next page">
            <ArrowRightIcon />
          </button>
        </nav>
      )}
    </div>
  );
}
