"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import DropdownMenu from "@/components/ui/DropdownMenu";
import ConfirmDialog from "@/components/ui/ConfirmDialog/ConfirmDialog";
import ChoiceDialog, { type ChoiceOption } from "@/components/ui/ChoiceDialog/ChoiceDialog";
import MessageDialog from "@/components/ui/MessageDialog/MessageDialog";
import MessagePersonDialog, { type PersonMessagePayload } from "@/features/forum/people/MessagePersonDialog/MessagePersonDialog";
import ReminderDialog, { type ReminderPayload, type ReminderTemplate } from "@/features/forum/people/ReminderDialog/ReminderDialog";
import { useForum } from "@/features/forum/lib/store";
import { displayName, fullName } from "@/features/forum/lib/people";
import type { ForumPerson, ForumSettings, PersonRole } from "@/features/forum/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DEFAULT_REPLIES = 2;

const ROLE_CHOICES: ChoiceOption[] = [
  { value: "learner", label: "Learner" },
  { value: "observer", label: "Auditor" },
];

const ROLE_LABEL: Record<PersonRole, string> = {
  learner: "Learner",
  assistant: "Assistant",
  instructor: "Instructor",
  observer: "Auditor",
};

const REASON_LABEL: Record<string, string> = {
  "not-started": "Not started",
  replies: "Replies due",
  post: "Post due",
  deadline: "Deadline soon",
};

type OpenDialog = "reminder" | "message" | "done" | "group" | "role" | "remove" | null;

interface DoneNotice {
  title: string;
  message: string;
}

type ReminderFields = ReminderPayload & { reason?: string; message?: string };
type MessageFields = PersonMessagePayload & { subject?: string; body?: string; message?: string; email?: boolean };

const groupLabel = (group: string) => (/^group\s/i.test(group) ? group : `Group ${group}`);

const withArticle = (role: string) => (/^[aeiou]/i.test(role) ? `an ${role}` : `a ${role}`);

const errorText = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

function shortDate(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function initialsOf(person: ForumPerson) {
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
}

function reminderSentMessage(name: string, payload: ReminderPayload) {
  const channels = [payload.email && "by email", payload.inApp && "in the app"].filter(Boolean).join(" and ");
  const timing =
    payload.when === "tomorrow" ? "will get it tomorrow at 9 AM" : payload.when === "deadline" ? "will get it before the deadline" : "will get it";
  return `${name} ${timing} ${channels}.`;
}

interface PersonActionsProps {
  weekId: string;
  person: ForumPerson;
  settings?: ForumSettings;
  triggerClassName?: string;
  onNotify?: (message: string) => void;
}

export default function PersonActions({ weekId, person, settings, triggerClassName }: PersonActionsProps) {
  const { peopleFor, updatePerson, removePerson, remindPerson, messagePerson } = useForum();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [notice, setNotice] = useState<DoneNotice>({ title: "", message: "" });
  const name = displayName(person);
  const initials = initialsOf(person);
  const weekPeople = peopleFor(weekId);

  const groupChoices = useMemo<ChoiceOption[]>(() => {
    const groups = new Set<string>();
    weekPeople.forEach((p) => {
      if (p.group) groups.add(p.group);
    });
    return [...groups].sort().map((g) => ({ value: g, label: groupLabel(g) }));
  }, [weekPeople]);

  const template = useMemo<ReminderTemplate>(
    () => ({
      postDue: shortDate(settings?.postDue, "18 Oct"),
      repliesDue: shortDate(settings?.repliesDue, "22 Oct"),
      repliesRequired: Number.parseInt(String(settings?.repliesEach ?? ""), 10) || DEFAULT_REPLIES,
    }),
    [settings?.postDue, settings?.repliesDue, settings?.repliesEach],
  );

  const subtitle = [person.group ? groupLabel(person.group) : "No group", ROLE_LABEL[person.role]].join(" · ");

  const close = () => setDialog(null);

  const showDone = (title: string, message: string) => {
    setNotice({ title, message });
    setDialog("done");
  };

  const sendReminder = async (payload: ReminderPayload) => {
    const fields = payload as ReminderFields;
    const reasonKey = fields.reason ?? (person.posts.length === 0 ? "not-started" : "replies");
    try {
      await remindPerson(weekId, person.id, {
        reason: REASON_LABEL[reasonKey] ?? reasonKey,
        when: payload.when,
        message: fields.message?.trim() || "This is a reminder to take part in this week's discussion forum before the deadline.",
        email: payload.email,
        inApp: payload.inApp,
      });
      showDone("Reminder sent", reminderSentMessage(name, payload));
    } catch (error) {
      showDone("Reminder not sent", errorText(error, "Something went wrong. Please try again."));
    }
  };

  const sendMessage = async (payload: PersonMessagePayload) => {
    const fields = payload as MessageFields;
    try {
      await messagePerson(weekId, person.id, {
        subject: fields.subject?.trim() || "Message from your instructor",
        body: (fields.body ?? fields.message ?? "").trim(),
        email: fields.email ?? true,
        allowReply: payload.allowReply,
      });
      showDone("Message sent", payload.allowReply ? `${name} can reply from their inbox.` : `${name} will see it in their inbox.`);
    } catch (error) {
      showDone("Message not sent", errorText(error, "Something went wrong. Please try again."));
    }
  };

  const changeGroup = (group: string) => {
    updatePerson(weekId, person.id, { group });
    showDone("Group changed", `${name} moved to ${groupLabel(group)}.`);
  };

  const changeRole = (role: string) => {
    const nextRole = role as PersonRole;
    updatePerson(weekId, person.id, { role: nextRole });
    showDone("Role changed", `${name} is now ${withArticle(ROLE_LABEL[nextRole])}.`);
  };

  const remove = () => {
    removePerson(weekId, person.id);
    showDone("Person removed", `${name} was removed from this week's forum.`);
  };

  return (
    <>
      <DropdownMenu
        label={`Actions for ${fullName(person)}`}
        triggerClassName={triggerClassName}
        trigger={
          <>
            Choose <ChevronDown size={20} strokeWidth={1.5} aria-hidden />
          </>
        }
        items={[
          { key: "remind", label: "Send reminder", onSelect: () => setDialog("reminder") },
          { key: "message", label: "Message", onSelect: () => setDialog("message") },
          { key: "group", label: "Change group", onSelect: () => setDialog("group") },
          { key: "role", label: "Change role", onSelect: () => setDialog("role") },
          { key: "remove", label: "Remove", onSelect: () => setDialog("remove") },
        ]}
      />

      <ReminderDialog
        open={dialog === "reminder"}
        personName={name}
        initials={initials}
        subtitle={subtitle}
        defaultReason={person.posts.length === 0 ? "not-started" : "replies"}
        template={template}
        onSend={(payload) => void sendReminder(payload)}
        onCancel={close}
      />

      <MessagePersonDialog
        open={dialog === "message"}
        personName={name}
        initials={initials}
        subtitle={subtitle}
        onSend={(payload) => void sendMessage(payload)}
        onCancel={close}
      />

      <ChoiceDialog
        open={dialog === "group"}
        title="Change group"
        description={`Choose a new group for ${name}.`}
        options={groupChoices}
        value={person.group ?? ""}
        onConfirm={changeGroup}
        onCancel={close}
      />

      <ChoiceDialog
        open={dialog === "role"}
        title="Change role"
        description={`${name} is currently ${ROLE_LABEL[person.role]}.`}
        options={ROLE_CHOICES}
        value={person.role}
        onConfirm={changeRole}
        onCancel={close}
      />

      <ConfirmDialog
        open={dialog === "remove"}
        title="Remove from forum?"
        message={`${fullName(person)} will be removed from this week's forum. This can't be undone.`}
        confirmLabel="Remove"
        onConfirm={remove}
        onCancel={close}
      />

      <MessageDialog open={dialog === "done"} title={notice.title} message={notice.message} buttonLabel="Done" variant="compact" onClose={close} />
    </>
  );
}