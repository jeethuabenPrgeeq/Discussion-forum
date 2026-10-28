import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./LearnerPager.module.css";

const pad2 = (n: number) => String(n).padStart(2, "0");

export function getPageWindow(total: number, page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;
  return { pageCount, current, start, end: Math.min(start + pageSize, total) };
}

interface LearnerPagerProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  label: string;
}

export default function LearnerPager({ total, page, pageSize, onPageChange, label }: LearnerPagerProps) {
  const { pageCount, current, start, end } = getPageWindow(total, page, pageSize);

  return (
    <div className={styles.footer}>
      <span className={styles.showing}>
        {total === 0 ? "Showing 0 entries" : `Showing ${pad2(start + 1)} to ${pad2(end)} of ${total}`}
      </span>
      <nav className={styles.pager} aria-label={label}>
        <button
          type="button"
          className={styles.nav}
          aria-label="Previous page"
          disabled={current === 1}
          onClick={() => onPageChange(current - 1)}
        >
          <ChevronLeft size={20} strokeWidth={1.75} aria-hidden />
        </button>
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            className={`${styles.num} ${n === current ? styles.current : ""}`}
            aria-current={n === current ? "page" : undefined}
            onClick={() => onPageChange(n)}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          className={styles.nav}
          aria-label="Next page"
          disabled={current === pageCount}
          onClick={() => onPageChange(current + 1)}
        >
          <ChevronRight size={20} strokeWidth={1.75} aria-hidden />
        </button>
      </nav>
    </div>
  );
}