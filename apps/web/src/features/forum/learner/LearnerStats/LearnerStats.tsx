import { LEARNER_SUMMARY } from "@/features/forum/lib/learner";
import styles from "./LearnerStats.module.css";

export default function LearnerStats() {
  const s = LEARNER_SUMMARY;
  const stats = [
    { key: "topics", label: "My Topics", value: `${s.myTopics.done} of ${s.myTopics.total}`, tone: styles.blue },
    { key: "replies", label: "My Replies", value: `${s.myReplies.done} of ${s.myReplies.total}`, tone: styles.purple },
    { key: "time", label: "Time Left", value: s.timeLeft, tone: styles.green },
    { key: "status", label: "Status", value: s.status, tone: styles.orange },
  ];

  return (
    <ul className={styles.stats}>
      {stats.map((item) => (
        <li key={item.key} className={styles.stat}>
          <span className={styles.label}>{item.label}</span>
          <span className={`${styles.value} ${item.tone}`}>{item.value}</span>
        </li>
      ))}
    </ul>
  );
}