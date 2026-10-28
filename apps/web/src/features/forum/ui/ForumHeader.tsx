import type { ReactNode } from "react";
import type { ForumDetail } from "@/features/forum/lib/types";
import { formatDay } from "@/features/forum/lib/utils";
import styles from "./ForumHeader.module.css";

export default function ForumHeader({ forum, status }: { forum: ForumDetail; status?: ReactNode }) {
  const deadlines = [
    { key: "post", label: "Post Due", date: forum.deadlines.postDue, tone: styles.blue },
    { key: "replies", label: "Replies Due", date: forum.deadlines.repliesDue, tone: styles.purple },
    { key: "cutoff", label: "Cut-off", date: forum.deadlines.cutoff, tone: styles.orange },
    { key: "grades", label: "Grades Out", date: forum.deadlines.gradesOut, tone: styles.green },
  ];

  return (
    <section className={styles.card} aria-labelledby="forum-title">
      <h1 id="forum-title" className={styles.title}>
        {forum.title}
      </h1>

      <div className={styles.meta}>
        <span className={styles.chip}>{forum.course}</span>
        <span className={styles.chip}>{forum.forumType}</span>
        <span className={styles.chip}>
          {forum.points} pts · {forum.gradingMode}
        </span>
        <span className={styles.chip}>{forum.instructor}</span>
        {status ?? (
          <span className={styles.status}>
            <span className={forum.isLive ? styles.live : styles.draft}>
              <span className={styles.statusDot} />
              {forum.isLive ? "Live" : "Draft"}
            </span>
            <span className={styles.posted}>
              {forum.postedCount} of {forum.totalCount} posted
            </span>
          </span>
        )}
      </div>

      <ul className={styles.deadlines}>
        {deadlines.map((d) => (
          <li key={d.key} className={`${styles.deadline} ${d.tone}`}>
            {d.label} : <time dateTime={d.date}>{formatDay(d.date)}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}