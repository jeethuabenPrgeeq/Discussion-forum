"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { GridViewIcon, MessageCircleMoreIcon, QuizIcon, SettingsGearIcon } from "@/components/icons";
import AccordionSection from "@/components/ui/Accordion";
import { DateTimeField, EditorField, NumberField, SelectField, SwitchField } from "@/components/form/FormFields";
import Toast, { useToast } from "@/components/toast/Toast";
import { useForum } from "@/features/forum/lib/store";
import { COUNT_OPTIONS, FORUM_SETTING_OPTIONS } from "@/features/forum/lib/options";
import type { ForumSettings } from "@/features/forum/lib/types";
import styles from "./SettingsView.module.css";

type SectionKey = "basics" | "dates" | "files" | "rules" | "groups" | "grading" | "completion" | "alerts";
type Errors = Partial<Record<keyof ForumSettings, string>>;
type OptionKey = keyof typeof FORUM_SETTING_OPTIONS;

const toOptions = (labels: readonly string[]) => labels.map((l) => ({ value: l, label: l }));
const opt = (key: OptionKey) => toOptions(FORUM_SETTING_OPTIONS[key]);
const COUNTS = toOptions(COUNT_OPTIONS);

const ALL_CLOSED: Record<SectionKey, boolean> = {
  basics: false,
  dates: false,
  files: false,
  rules: false,
  groups: false,
  grading: false,
  completion: false,
  alerts: false,
};

const DATE_ORDER: (keyof ForumSettings)[] = ["opensAt", "postDue", "repliesDue", "cutoff", "gradeBy"];

const DATE_LABEL: Partial<Record<keyof ForumSettings, string>> = {
  opensAt: "Opens",
  postDue: "Post Due",
  repliesDue: "Replies Due",
  cutoff: "Cut-off",
  gradeBy: "Grade By",
};

const FIELD_SECTION: Partial<Record<keyof ForumSettings, SectionKey>> = {
  opensAt: "dates",
  postDue: "dates",
  repliesDue: "dates",
  cutoff: "dates",
  gradeBy: "dates",
  maxGrade: "grading",
  passMark: "grading",
  expectedBy: "completion",
};

function validate(s: ForumSettings): Errors {
  const errors: Errors = {};
  DATE_ORDER.forEach((key) => {
    if (!s[key]) errors[key] = "Pick a date and time";
  });
  for (let i = 1; i < DATE_ORDER.length; i++) {
    const prev = DATE_ORDER[i - 1];
    const curr = DATE_ORDER[i];
    if (!errors[curr] && String(s[curr]) < String(s[prev])) {
      errors[curr] = `Must be on or after ${DATE_LABEL[prev]}`;
    }
  }
  if (s.expectedBy && s.expectedBy < s.opensAt) errors.expectedBy = "Must be after Opens";
  if (s.maxGrade < 1) errors.maxGrade = "Must be at least 1";
  if (s.passMark > s.maxGrade) errors.passMark = "Can't be higher than Max";
  return errors;
}

export default function SettingsView() {
  const { weekId, settingsFor, publishSettings } = useForum();
  const published = settingsFor(weekId);
  const draftKey = `forum-settings-draft:${weekId}`;

  const [form, setForm] = useState<ForumSettings>(published);
  const [open, setOpen] = useState(ALL_CLOSED);
  const [errors, setErrors] = useState<Errors>({});
  const [editorKey, setEditorKey] = useState(0);
  const toast = useToast();

  const dirty = JSON.stringify(form) !== JSON.stringify(published);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      setForm({ ...published, ...(JSON.parse(raw) as Partial<ForumSettings>) });
      setEditorKey((k) => k + 1);
    } catch {}
  }, [draftKey, published]);

  const set =
    <K extends keyof ForumSettings>(key: K) =>
    (value: ForumSettings[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
      if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    };

  const toggle = (key: SectionKey) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  const saveDraft = () => {
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(form));
      toast.show("Draft saved");
    } catch {
      toast.show("Could not save the draft");
    }
  };

  const cancel = () => {
    if (dirty && !window.confirm("Discard your unsaved settings changes?")) return;
    setForm(published);
    setErrors({});
    setEditorKey((k) => k + 1);
    try {
      window.localStorage.removeItem(draftKey);
    } catch {}
  };

  const publish = () => {
    const next = validate(form);
    setErrors(next);
    const invalid = Object.keys(next) as (keyof ForumSettings)[];
    if (invalid.length) {
      setOpen((o) => {
        const copy = { ...o };
        invalid.forEach((k) => {
          const section = FIELD_SECTION[k];
          if (section) copy[section] = true;
        });
        return copy;
      });
      toast.show("Fix the highlighted fields before publishing");
      return;
    }
    publishSettings(weekId, {
      ...form,
      about: DOMPurify.sanitize(form.about, { USE_PROFILES: { html: true } }),
      goals: DOMPurify.sanitize(form.goals, { USE_PROFILES: { html: true } }),
    });
    try {
      window.localStorage.removeItem(draftKey);
    } catch {}
    toast.show("Settings published");
  };

  return (
    <div className={styles.view}>
      <div className={styles.sections}>
        <AccordionSection title="Basics" icon={<GridViewIcon />} tone="blue" open={open.basics} onToggle={() => toggle("basics")}>
          <div className={styles.stack}>
            <div className={styles.grid}>
              <SelectField label="Name" value={form.name} options={opt("name")} onChange={set("name")} />
              <SelectField label="Course" value={form.course} options={opt("course")} onChange={set("course")} />
              <SelectField label="Type" value={form.forumType} options={opt("forumType")} onChange={set("forumType")} />
            </div>
            <EditorField key={`about-${editorKey}`} label="About" value={form.about} onChange={set("about")} placeholder="Describe what this forum is for…" />
            <EditorField key={`goals-${editorKey}`} label="Goals" value={form.goals} onChange={set("goals")} placeholder="---" />
            <div className={styles.grid}>
              <SelectField label="Week / module" value={form.weekModule} options={opt("weekModule")} onChange={set("weekModule")} />
              <SwitchField label="Show on Course Page" text="Click" checked={form.showOnCoursePage} onChange={set("showOnCoursePage")} />
            </div>
          </div>
        </AccordionSection>

        <AccordionSection title="Dates" icon={<SettingsGearIcon />} tone="orange" open={open.dates} onToggle={() => toggle("dates")}>
          <div className={styles.grid}>
            <DateTimeField label="Opens" value={form.opensAt} onChange={set("opensAt")} error={errors.opensAt} />
            <DateTimeField label="Post Due" value={form.postDue} onChange={set("postDue")} error={errors.postDue} />
            <DateTimeField label="Replies Due" value={form.repliesDue} onChange={set("repliesDue")} error={errors.repliesDue} />
            <DateTimeField label="Cut-off" value={form.cutoff} onChange={set("cutoff")} error={errors.cutoff} />
            <DateTimeField label="Grade By" value={form.gradeBy} onChange={set("gradeBy")} error={errors.gradeBy} />
            <SelectField label="Visibility" value={form.visibility} options={opt("visibility")} onChange={set("visibility")} />
          </div>
        </AccordionSection>

        <AccordionSection title="Files and Words" icon={<QuizIcon />} tone="red" open={open.files} onToggle={() => toggle("files")}>
          <div className={styles.grid}>
            <NumberField label="Max Files" value={form.maxFiles} onChange={set("maxFiles")} min={0} max={10} pad={2} />
            <SelectField label="Max Size" value={form.maxSize} options={opt("maxSize")} onChange={set("maxSize")} />
            <SelectField label="File Types" value={form.fileTypes} options={opt("fileTypes")} onChange={set("fileTypes")} />
            <SwitchField label="Show word count" text="Permission to Show" checked={form.showWordCount} onChange={set("showWordCount")} />
            <NumberField label="Min Words" value={form.minWords} onChange={set("minWords")} min={0} max={5000} step={10} />
            <SelectField label="Edit Window" value={form.editWindow} options={opt("editWindow")} onChange={set("editWindow")} />
          </div>
        </AccordionSection>

        <AccordionSection title="Rules" icon={<MessageCircleMoreIcon />} tone="olive" open={open.rules} onToggle={() => toggle("rules")}>
          <div className={styles.grid}>
            <SelectField label="Topics Each" value={form.topicsEach} options={COUNTS} onChange={set("topicsEach")} />
            <SelectField label="Replies Each" value={form.repliesEach} options={COUNTS} onChange={set("repliesEach")} />
            <SwitchField label="Learners start topics" text="Permission to Start" checked={form.learnersStartTopics} onChange={set("learnersStartTopics")} />
            <SwitchField label="Post first, then read" text="Permission" checked={form.postFirstThenRead} onChange={set("postFirstThenRead")} />
            <SwitchField label="Anonymous posts" text="Permission" checked={form.anonymousPosts} onChange={set("anonymousPosts")} />
          </div>
        </AccordionSection>

        <AccordionSection title="Groups" icon={<MessageCircleMoreIcon />} tone="olive" open={open.groups} onToggle={() => toggle("groups")}>
          <div className={styles.grid}>
            <SelectField label="Group Mode" value={form.groupMode} options={opt("groupMode")} onChange={set("groupMode")} />
            <SelectField label="Grouping" value={form.grouping} options={opt("grouping")} onChange={set("grouping")} />
            <SelectField label="Restrict by" value={form.restrictBy} options={opt("restrictBy")} onChange={set("restrictBy")} />
          </div>
        </AccordionSection>

        <AccordionSection title="Grading" icon={<MessageCircleMoreIcon />} tone="olive" open={open.grading} onToggle={() => toggle("grading")}>
          <div className={styles.grid}>
            <SelectField label="Types" value={form.gradingType} options={opt("gradingType")} onChange={set("gradingType")} />
            <NumberField label="Max" value={form.maxGrade} onChange={set("maxGrade")} min={1} max={1000} error={errors.maxGrade} />
            <SelectField label="Method" value={form.gradingMethod} options={opt("gradingMethod")} onChange={set("gradingMethod")} />
            <NumberField label="Pass Mark" value={form.passMark} onChange={set("passMark")} min={0} max={1000} error={errors.passMark} />
            <SwitchField label="Anonymous Grading" text="Permission anonymous" checked={form.anonymousGrading} onChange={set("anonymousGrading")} />
            <SelectField label="Late Penalty" value={form.latePenalty} options={opt("latePenalty")} onChange={set("latePenalty")} />
          </div>
        </AccordionSection>

        <AccordionSection title="Completion" icon={<MessageCircleMoreIcon />} tone="olive" open={open.completion} onToggle={() => toggle("completion")}>
          <div className={styles.grid}>
            <SelectField label="Track" value={form.track} options={opt("track")} onChange={set("track")} />
            <SwitchField label="Need Grade" text="Permission for Grade" checked={form.needGrade} onChange={set("needGrade")} />
            <SelectField label="Need Posts" value={form.needPosts} options={opt("needPost")} onChange={set("needPosts")} />
            <DateTimeField label="Expected By" value={form.expectedBy} onChange={set("expectedBy")} error={errors.expectedBy} />
          </div>
        </AccordionSection>

        <AccordionSection title="Alerts" icon={<MessageCircleMoreIcon />} tone="olive" open={open.alerts} onToggle={() => toggle("alerts")}>
          <div className={styles.grid}>
            <SelectField label="Subscription" value={form.subscription} options={opt("subscription")} onChange={set("subscription")} />
            <SelectField label="Digest" value={form.digest} options={opt("digest")} onChange={set("digest")} />
            <SelectField label="Notify me on" value={form.notifyMeOn} options={opt("notifyMeOn")} onChange={set("notifyMeOn")} />
          </div>
        </AccordionSection>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={cancel}>
          Cancel
        </button>
        <button type="button" className={styles.btn} onClick={saveDraft}>
          Save Draft
        </button>
        <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={publish}>
          Publish
        </button>
      </div>

      <Toast message={toast.message} />
    </div>
  );
}
