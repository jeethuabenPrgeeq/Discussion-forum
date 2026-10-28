export type GradeStatus = "published" | "pending";
export type AskType = "marks" | "recheck" | "feedback" | "other";
export type AskAbout = "overall" | "original" | "reply1" | "reply2" | "feedback";

export interface RubricRow {
  id: string;
  label: string;
  max: number;
  marks: number;
  comment?: string;
}

export interface PeerRubricRow {
  id: string;
  label: string;
  max: number;
  replies: number[];
}

export const GRADE_STATUS_OPTIONS: { value: GradeStatus; label: string }[] = [
  { value: "published", label: "Published" },
  { value: "pending", label: "Not published yet" },
];

export const PARTICIPANT = {
  name: "Priya N",
  studentId: "S001",
  course: "CS201- Data Structure",
  topic: "Trees in the Wild",
  submittedAt: "14 Oct 2026, 10:42",
  rubricVersion: "v2.1",
};

export const ORIGINAL_POST_RUBRIC: RubricRow[] = [
  { id: "o-1", label: "Topic Relevance", max: 10, marks: 9 },
  { id: "o-2", label: "Subject Knowledge & Understanding", max: 15, marks: 14 },
  { id: "o-3", label: "Critical Thinking & Analysis", max: 15, marks: 13 },
  { id: "o-4", label: "Supporting Evidence & Examples", max: 10, marks: 9 },
  { id: "o-5", label: "Originality & Practical Application", max: 10, marks: 9 },
  { id: "o-6", label: "Clarity & Organization", max: 5, marks: 5 },
  { id: "o-7", label: "Professional Communication", max: 5, marks: 5 },
];

export const PEER_REPLY_RUBRIC: PeerRubricRow[] = [
  { id: "p-1", label: "Relevance to Discussion", max: 4, replies: [4, 3] },
  { id: "p-2", label: "Constructive Contribution", max: 5, replies: [5, 5] },
  { id: "p-3", label: "Reasoning & Evidence", max: 4, replies: [4, 4] },
  { id: "p-4", label: "Respectful Interaction", max: 2, replies: [2, 2] },
];

export const EVALUATOR_FEEDBACK = {
  overall: "Strong comparison with clear Examples.",
  improvement: "Add cache locality.",
  evaluator: "Dr. A. Rao",
  evaluatedOn: "22-10-2026",
};

export const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export const gradeLetter = (percent: number) => {
  if (percent >= 90) return "A";
  if (percent >= 80) return "B";
  if (percent >= 70) return "C";
  if (percent >= 60) return "D";
  return "F";
};

export function getGradeSummary() {
  const originalMax = sum(ORIGINAL_POST_RUBRIC.map((r) => r.max));
  const originalMarks = sum(ORIGINAL_POST_RUBRIC.map((r) => r.marks));
  const replyMax = sum(PEER_REPLY_RUBRIC.map((r) => r.max));
  const replyCount = PEER_REPLY_RUBRIC[0]?.replies.length ?? 0;
  const replyMarks = Array.from({ length: replyCount }, (_, i) => sum(PEER_REPLY_RUBRIC.map((r) => r.replies[i] ?? 0)));
  const max = originalMax + replyMax * replyCount;
  const total = originalMarks + sum(replyMarks);
  const percent = max ? Math.round((total / max) * 100) : 0;
  return { originalMax, originalMarks, replyMax, replyMarks, max, total, percent, letter: gradeLetter(percent) };
}

export const ASK_TO_OPTIONS: { value: string; label: string }[] = [{ value: "rao", label: "Dr. A Rao Evaluator" }];

export const ASK_COURSE_OPTIONS: { value: string; label: string }[] = [{ value: "cs201", label: "CS201- Data Structure" }];

export const ASK_TYPE_OPTIONS: { value: AskType; label: string }[] = [
  { value: "marks", label: "Question about my marks" },
  { value: "recheck", label: "Request a re-check" },
  { value: "feedback", label: "Clarify feedback" },
  { value: "other", label: "Other" },
];

export const ASK_ABOUT_OPTIONS: { value: AskAbout; label: string }[] = [
  { value: "overall", label: "Overall grade" },
  { value: "original", label: "Original post" },
  { value: "reply1", label: "Peer reply 1" },
  { value: "reply2", label: "Peer reply 2" },
  { value: "feedback", label: "Evaluator feedback" },
];

export function getPartOptions(about: AskAbout): { value: string; label: string }[] {
  const whole = { value: "whole", label: "Whole Section" };
  if (about === "original") return [whole, ...ORIGINAL_POST_RUBRIC.map((r) => ({ value: r.id, label: r.label }))];
  if (about === "reply1" || about === "reply2") return [whole, ...PEER_REPLY_RUBRIC.map((r) => ({ value: r.id, label: r.label }))];
  if (about === "feedback") {
    return [whole, { value: "overall-feedback", label: "Overall feedback" }, { value: "improvement", label: "Area to improve" }];
  }
  return [whole, { value: "total", label: "Grand Total" }, { value: "letter", label: "Final Grade" }];
}