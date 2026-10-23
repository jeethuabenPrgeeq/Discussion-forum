'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Mail, UserRound } from 'lucide-react';
import { DownloadIcon } from '@/components/icons';
import Checkbox from '@/components/form/Checkbox';
import { DateTimeField, SelectField, SwitchField, TextField } from '@/components/form/FormFields';
import { useForum } from '@/features/forum/lib/store';
import { WEEKS } from '@/features/forum/lib/mock';
import { EMAIL_PATTERN, createPerson, displayName, groupFromOption } from '@/features/forum/lib/people';
import { GROUP_OPTIONS, ROLE_OPTIONS } from '@/features/forum/lib/options';
import type { ForumSettings, PersonRole } from '@/features/forum/lib/types';
import styles from './AddPersonView.module.css';

interface AddPersonViewProps {
  onBack: () => void;
  onBulkUpload: () => void;
  onSaved: (message: string, addAnother: boolean) => void;
}

interface PersonDraft {
  firstName: string;
  lastName: string;
  email: string;
  role: PersonRole;
  group: string;
  accessStarts: string;
  accessEnds: string;
  canPost: boolean;
  reminder: boolean;
}

type DraftErrors = Partial<Record<keyof PersonDraft, string>>;

const emptyDraft = (settings: ForumSettings): PersonDraft => ({
  firstName: '',
  lastName: '',
  email: '',
  role: 'learner',
  group: 'none',
  accessStarts: settings.opensAt.slice(0, 10),
  accessEnds: settings.cutoff.slice(0, 10),
  canPost: true,
  reminder: true,
});

export default function AddPersonView({ onBack, onBulkUpload, onSaved }: AddPersonViewProps) {
  const { weekId, peopleFor, addPeople, settingsFor } = useForum();
  const settings = settingsFor(weekId);
  const titleId = useId();
  const refs = {
    firstName: useRef<HTMLInputElement>(null),
    lastName: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
  };

  const [draft, setDraft] = useState<PersonDraft>(() => emptyDraft(settings));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [emailInvite, setEmailInvite] = useState(true);
  const [allWeeks, setAllWeeks] = useState(false);
  const [addAnother, setAddAnother] = useState(false);

  const set = <K extends keyof PersonDraft>(key: K, value: PersonDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const validate = (): DraftErrors => {
    const next: DraftErrors = {};
    const email = draft.email.trim().toLowerCase();
    if (!draft.firstName.trim()) next.firstName = 'Enter a first name.';
    if (!draft.lastName.trim()) next.lastName = 'Enter a last name.';
    if (!EMAIL_PATTERN.test(email)) next.email = 'Enter a valid email address.';
    else if (!allWeeks && peopleFor(weekId).some((p) => p.email === email)) {
      next.email = 'This person is already in this week.';
    }
    if (!draft.accessStarts) next.accessStarts = 'Pick a start date.';
    if (!draft.accessEnds) next.accessEnds = 'Pick an end date.';
    else if (draft.accessStarts && draft.accessEnds < draft.accessStarts) {
      next.accessEnds = 'Access must end on or after it starts.';
    }
    return next;
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validate();
    if (Object.keys(found).length) {
      setErrors(found);
      const first = (['firstName', 'lastName', 'email'] as const).find((k) => found[k]);
      if (first) refs[first].current?.focus();
      return;
    }

    const person = {
      ...createPerson(
        {
          firstName: draft.firstName.trim(),
          lastName: draft.lastName.trim(),
          email: draft.email.trim().toLowerCase(),
          role: draft.role,
          group: groupFromOption(draft.group),
        },
        settings,
      ),
      accessStarts: draft.accessStarts,
      accessEnds: draft.accessEnds,
      canPost: draft.canPost,
      reminder: draft.reminder,
    };

    const targets = allWeeks ? WEEKS.map((w) => w.id) : [weekId];
    let added = 0;
    for (const id of targets) {
      if (peopleFor(id).some((p) => p.email === person.email)) continue;
      addPeople(id, [{ ...person, id: `${person.id}-${id}` }]);
      added += 1;
    }

    if (added === 0) {
      setErrors({ email: 'This person is already in every week.' });
      refs.email.current?.focus();
      return;
    }

    const name = displayName(person);
    const message = allWeeks ? `${name} added to ${added} ${added === 1 ? 'week' : 'weeks'}.` : `${name} added.`;

    if (addAnother) {
      setDraft((d) => ({ ...d, firstName: '', lastName: '', email: '' }));
      refs.firstName.current?.focus();
    }
    onSaved(message, addAnother);
  };

  return (
    <div className={styles.view}>
      <div className={styles.bar}>
        <button type="button" className={styles.back} onClick={onBack}>
          <ArrowLeft size={20} strokeWidth={1.5} aria-hidden />
          People
        </button>
        <button type="button" className={styles.bulk} onClick={onBulkUpload}>
          <DownloadIcon aria-hidden />
          Bulk Upload
        </button>
      </div>

      <form className={styles.card} aria-labelledby={titleId} onSubmit={submit} noValidate>
        <h2 id={titleId} className={styles.title}>
          Add Person
        </h2>

        <div className={styles.grid}>
          <TextField
            label="First Name"
            value={draft.firstName}
            onChange={(v) => set('firstName', v)}
            placeholder="Enter first name....."
            icon={<UserRound size={20} strokeWidth={1.25} />}
            autoComplete="off"
            maxLength={50}
            inputRef={refs.firstName}
            error={errors.firstName}
          />
          <TextField
            label="Last Name"
            value={draft.lastName}
            onChange={(v) => set('lastName', v)}
            placeholder="Enter last name....."
            icon={<UserRound size={20} strokeWidth={1.25} />}
            autoComplete="off"
            maxLength={50}
            inputRef={refs.lastName}
            error={errors.lastName}
          />
          <TextField
            label="Email"
            type="email"
            value={draft.email}
            onChange={(v) => set('email', v)}
            placeholder="name@gmail.com"
            icon={<Mail size={20} strokeWidth={1.25} />}
            autoComplete="off"
            maxLength={254}
            inputRef={refs.email}
            error={errors.email}
          />
          <SelectField label="Role" value={draft.role} options={ROLE_OPTIONS} onChange={(v) => set('role', v)} />
          <SelectField label="Group" value={draft.group} options={GROUP_OPTIONS} onChange={(v) => set('group', v)} />
          <DateTimeField
            type="date"
            label="Access Starts"
            value={draft.accessStarts}
            onChange={(v) => set('accessStarts', v)}
            error={errors.accessStarts}
          />
          <DateTimeField
            type="date"
            label="Access Ends"
            value={draft.accessEnds}
            onChange={(v) => set('accessEnds', v)}
            error={errors.accessEnds}
          />
          <SwitchField
            label="Can Post"
            text="Allow learner to post"
            checked={draft.canPost}
            onChange={(v) => set('canPost', v)}
          />
          <SwitchField
            label="Reminder"
            text="Send Reminder"
            checked={draft.reminder}
            onChange={(v) => set('reminder', v)}
          />
        </div>

        <fieldset className={styles.options}>
          <legend className={styles.srOnly}>After adding</legend>
          <Checkbox label="Email invite now" checked={emailInvite} onChange={setEmailInvite} />
          <Checkbox label="Add to all weeks" checked={allWeeks} onChange={setAllWeeks} />
          <Checkbox label="Add another after saving" checked={addAnother} onChange={setAddAnother} />
        </fieldset>

        <div className={styles.footer}>
          <button type="button" className={styles.btn} onClick={onBack}>
            Cancel
          </button>
          <button type="submit" className={`${styles.btn} ${styles.submit}`}>
            Add Person
          </button>
        </div>
      </form>
    </div>
  );
}