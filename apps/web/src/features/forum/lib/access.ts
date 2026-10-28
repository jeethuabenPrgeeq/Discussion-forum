export type AccessRole = "instructor" | "ta" | "learner" | "auditor";

export type AccessPermission =
  | "view"
  | "startTopics"
  | "reply"
  | "editOwn"
  | "editAny"
  | "deleteAny"
  | "pinLock"
  | "grade"
  | "reports"
  | "export"
  | "overrideGroups";

export type AccessMatrix = Record<AccessPermission, Record<AccessRole, boolean>>;

export const ACCESS_ROLES: { key: AccessRole; label: string }[] = [
  { key: "instructor", label: "Instructor" },
  { key: "ta", label: "TA" },
  { key: "learner", label: "Learner" },
  { key: "auditor", label: "Auditor" },
];

export const ACCESS_PERMISSIONS: { key: AccessPermission; label: string }[] = [
  { key: "view", label: "View" },
  { key: "startTopics", label: "Start topics" },
  { key: "reply", label: "Reply" },
  { key: "editOwn", label: "Edit own" },
  { key: "editAny", label: "Edit any" },
  { key: "deleteAny", label: "Delete any" },
  { key: "pinLock", label: "Pin/lock" },
  { key: "grade", label: "Grade" },
  { key: "reports", label: "Reports" },
  { key: "export", label: "Export" },
  { key: "overrideGroups", label: "Override groups" },
];

const row = (instructor: boolean, ta: boolean, learner: boolean, auditor: boolean) => ({
  instructor,
  ta,
  learner,
  auditor,
});

export const DEFAULT_ACCESS: AccessMatrix = {
  view: row(true, true, true, true),
  startTopics: row(true, true, true, false),
  reply: row(true, true, true, false),
  editOwn: row(true, true, true, false),
  editAny: row(true, true, false, false),
  deleteAny: row(true, true, false, false),
  pinLock: row(true, true, false, false),
  grade: row(true, true, false, false),
  reports: row(true, true, false, false),
  export: row(true, false, false, false),
  overrideGroups: row(true, false, false, false),
};