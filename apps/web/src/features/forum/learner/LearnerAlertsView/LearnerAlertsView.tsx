"use client";

import { useEffect, useState } from "react";
import RadioDropdown from "@/components/form/RadioDropdown";
import { SwitchField } from "@/components/form/FormFields";
import Toast, { useToast } from "@/components/toast/Toast";
import { api, ApiError } from "@/features/forum/lib/api";
import { useForum } from "@/features/forum/lib/store";
import styles from "./LearnerAlertsView.module.css";

type Subscribe = "all" | "mine" | "off";
type Digest = "daily" | "weekly" | "off";
type TellWhen = "replies" | "feedback" | "grade";

interface AlertPrefs {
  subscribe: Subscribe;
  digest: Digest;
  tellWhen: TellWhen;
  autoRead: boolean;
}

const SUBSCRIBE_OPTIONS: { value: Subscribe; label: string }[] = [
  { value: "all", label: "All Posts" },
  { value: "mine", label: "My topics" },
  { value: "off", label: "Off" },
];

const DIGEST_OPTIONS: { value: Digest; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "off", label: "Off" },
];

const TELL_OPTIONS: { value: TellWhen; label: string }[] = [
  { value: "replies", label: "Someone replies" },
  { value: "feedback", label: "Feedback" },
  { value: "grade", label: "Grade out" },
];

const DEFAULTS: AlertPrefs = { subscribe: "all", digest: "daily", tellWhen: "replies", autoRead: true };

export default function LearnerAlertsView({ weekId }: { weekId: string }) {
  const { forumIdFor } = useForum();
  const forumId = forumIdFor(weekId);
  const [prefs, setPrefs] = useState<AlertPrefs>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!forumId) return;
    let cancelled = false;
    api<AlertPrefs>(`/forums/${forumId}/alert-preferences`)
      .then((data) => {
        if (!cancelled) setPrefs({ ...DEFAULTS, ...data });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [forumId]);

  const set =
    <K extends keyof AlertPrefs>(key: K) =>
    (value: AlertPrefs[K]) =>
      setPrefs((p) => ({ ...p, [key]: value }));

  const save = async () => {
    if (!forumId || saving) return;
    setSaving(true);
    try {
      const saved = await api<AlertPrefs>(`/forums/${forumId}/alert-preferences`, { method: "PUT", json: prefs });
      setPrefs({ ...DEFAULTS, ...saved });
      toast.show("Alert preferences saved");
    } catch (error) {
      toast.show(error instanceof ApiError ? error.message : "Could not save your preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.card} aria-labelledby="alerts-title">
      <h2 id="alerts-title" className={styles.title}>
        My Alerts
      </h2>

      <div className={styles.grid}>
        <RadioDropdown variant="field" label="Subscribe" value={prefs.subscribe} options={SUBSCRIBE_OPTIONS} onChange={set("subscribe")} />
        <RadioDropdown variant="field" label="Digest" value={prefs.digest} options={DIGEST_OPTIONS} onChange={set("digest")} />
        <RadioDropdown variant="field" label="Tell me when" value={prefs.tellWhen} options={TELL_OPTIONS} onChange={set("tellWhen")} />
        <SwitchField label="Auto-mark read" text="auto read" checked={prefs.autoRead} onChange={set("autoRead")} />
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.save} onClick={() => void save()} disabled={saving || !forumId}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <Toast message={toast.message} />
    </section>
  );
}