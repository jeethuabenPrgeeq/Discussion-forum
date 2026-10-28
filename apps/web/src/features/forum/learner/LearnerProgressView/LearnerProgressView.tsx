"use client";

import { useState } from "react";
import LearnerStats from "@/features/forum/learner/LearnerStats/LearnerStats";
import LearnerPager, { getPageWindow } from "@/features/forum/learner/LearnerPager/LearnerPager";
import { LEARNER_SUMMARY, MY_POSTS, POST_TYPE_LABEL } from "@/features/forum/lib/learner";
import styles from "./LearnerProgressView.module.css";

const PAGE_SIZE = 5;

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function LearnerProgressView({ minWords }: { minWords: number }) {
  const [page, setPage] = useState(1);

  const done = LEARNER_SUMMARY.myTopics.done + LEARNER_SUMMARY.myReplies.done;
  const total = LEARNER_SUMMARY.myTopics.total + LEARNER_SUMMARY.myReplies.total;
  const percent = total ? Math.round((done / total) * 100) : 0;

  const { start, end } = getPageWindow(MY_POSTS.length, page, PAGE_SIZE);
  const visible = MY_POSTS.slice(start, end);

  return (
    <div className={styles.view}>
      <LearnerStats />

      <section className={styles.progressCard} aria-labelledby="progress-title">
        <h2 id="progress-title" className={styles.doneTitle}>
          {done} of {total} done
        </h2>
        <div
          className={styles.track}
          role="progressbar"
          aria-labelledby="progress-title"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <span className={styles.fill} style={{ width: `${percent}%` }} />
        </div>
      </section>

      <section className={styles.card} aria-label="My posts">
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <colgroup>
              <col className={styles.colPost} />
              <col className={styles.colType} />
              <col className={styles.colDate} />
              <col className={styles.colWords} />
              <col className={styles.colStatus} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">My Post</th>
                <th scope="col">Type</th>
                <th scope="col">Date</th>
                <th scope="col">Words</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    You haven&apos;t posted yet
                  </td>
                </tr>
              ) : (
                visible.map((p) => {
                  const counted = p.words >= minWords;
                  return (
                    <tr key={p.id}>
                      <td className={styles.postCell}>{p.title}</td>
                      <td>{POST_TYPE_LABEL[p.type]}</td>
                      <td>
                        <time dateTime={p.date}>{formatDate(p.date)}</time>
                      </td>
                      <td>{p.words}</td>
                      <td>
                        <span className={`${styles.pill} ${counted ? styles.counted : styles.under}`}>
                          {counted ? "Counted" : `Under ${minWords}`}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <LearnerPager total={MY_POSTS.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} label="Post pages" />
    </div>
  );
}