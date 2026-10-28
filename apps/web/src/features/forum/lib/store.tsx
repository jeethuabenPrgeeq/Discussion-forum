"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "./api";
import { WEEKS, getDefaultSettings, getForumDetail } from "./mock";
import { scoresOf } from "./grading";
import type {
  Evaluation,
  ForumDetail,
  ForumPerson,
  ForumPost,
  ForumSettings,
  ForumTopic,
  Participation,
} from "./types";

interface ApiForum {
  id: string;
  position: number;
  title: string;
  course: string;
  weekLabel: string;
  instructor: string;
  settings?: Partial<ForumSettings>;
  stats?: { learners: number; posted: number };
}

interface ApiThread {
  topic: ForumTopic;
  posts: ForumPost[];
}

export interface ReminderInput {
  reason: string;
  when: "now" | "tomorrow" | "deadline";
  message: string;
  email: boolean;
  inApp: boolean;
}

export interface MessageInput {
  subject: string;
  body: string;
  email: boolean;
  allowReply: boolean;
}

export interface NewTopicRequest {
  title: string;
  body: string;
  group?: string;
  participation?: Participation;
  attachmentIds?: string[];
}

interface ForumStore {
  now: number;
  ready: boolean;
  error: string | null;
  weekId: string;
  setWeekId: (id: string) => void;
  forumIdFor: (weekId: string) => string | undefined;
  forumDetailFor: (weekId: string) => ForumDetail;
  topicsByWeek: Record<string, ForumTopic[]>;
  findTopic: (topicId: string) => { topic: ForumTopic; weekId: string } | null;
  addTopic: (weekId: string, topic: ForumTopic, openingPost: ForumPost, attachmentIds?: string[]) => void;
  createTopic: (weekId: string, input: NewTopicRequest) => Promise<ForumTopic>;
  updateTopic: (topicId: string, patch: Partial<ForumTopic>) => void;
  deleteTopic: (topicId: string) => Promise<void>;
  moveTopic: (topicId: string, targetWeekId: string) => void;
  loadPosts: (topicId: string, force?: boolean) => Promise<void>;
  postsFor: (topicId: string) => ForumPost[];
  addPost: (post: ForumPost, attachmentIds?: string[]) => void;
  updatePost: (topicId: string, postId: string, patch: Partial<ForumPost>) => void;
  deletePost: (topicId: string, postId: string) => void;
  setBestAnswer: (topicId: string, postId: string | null) => void;
  reportPost: (topicId: string, postId: string, reason: string, details: string, reporterKey: string) => void;
  settingsFor: (weekId: string) => ForumSettings;
  publishSettings: (weekId: string, settings: ForumSettings) => void;
  loadPeople: (weekId: string, force?: boolean) => Promise<void>;
  peopleFor: (weekId: string) => ForumPerson[];
  addPeople: (weekId: string, people: ForumPerson[]) => void;
  updatePerson: (weekId: string, personId: string, patch: Partial<ForumPerson>) => void;
  removePerson: (weekId: string, personId: string) => void;
  remindPerson: (weekId: string, personId: string, input: ReminderInput) => Promise<void>;
  messagePerson: (weekId: string, personId: string, input: MessageInput) => Promise<void>;
  loadEvaluations: (weekId: string, force?: boolean) => Promise<void>;
  evaluationFor: (weekId: string, personId: string) => Evaluation | undefined;
  saveEvaluation: (weekId: string, evaluation: Evaluation) => void;
}

const ForumContext = createContext<ForumStore | null>(null);

const TOPIC_API_FIELDS = ["title", "isPinned", "isLocked", "state", "participation"] as const;

const DEFAULT_REMINDER: ReminderInput = {
  reason: "Not started",
  when: "now",
  message: "This is a reminder to take part in this week's discussion forum before the deadline.",
  email: true,
  inApp: true,
};

const weekKeyFor = (position: number) => WEEKS[position - 1]?.id ?? `w${position}`;

const weekById = (id: string) => WEEKS.find((w) => w.id === id) ?? WEEKS[0];

const emptyWeeks = () => Object.fromEntries(WEEKS.map((w): [string, ForumTopic[]] => [w.id, []]));

export function ForumProvider({ children }: { children: ReactNode }) {
  const [peopleByWeek, setPeopleByWeek] = useState<Record<string, ForumPerson[]>>({});
  const [evaluationsByWeek, setEvaluationsByWeek] = useState<Record<string, Record<string, Evaluation>>>({});
  const [weekId, setWeekId] = useState("w4");
  const [topicsByWeek, setTopicsByWeek] = useState<Record<string, ForumTopic[]>>(emptyWeeks);
  const [postsByTopic, setPostsByTopic] = useState<Record<string, ForumPost[]>>({});
  const [settingsByWeek, setSettingsByWeek] = useState<Record<string, ForumSettings>>(() =>
    Object.fromEntries(WEEKS.map((w): [string, ForumSettings] => [w.id, getDefaultSettings(w)])),
  );
  const [forumsByWeek, setForumsByWeek] = useState<Record<string, ApiForum>>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const loadedTopics = useRef(new Set<string>());
  const pendingTopics = useRef(new Map<string, Promise<void>>());
  const loadedPeople = useRef(new Set<string>());
  const loadedEvaluations = useRef(new Set<string>());
  const loadedSettings = useRef(new Set<string>());
  const chains = useRef(new Map<string, Promise<void>>());
  const realIds = useRef(new Map<string, string>());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const forumIdByWeek = useMemo(
    () => Object.fromEntries(Object.entries(forumsByWeek).map(([w, f]): [string, string] => [w, f.id])),
    [forumsByWeek],
  );

  const resolveId = useCallback((id: string) => realIds.current.get(id) ?? id, []);

  const mapTopics = useCallback(
    (fn: (t: ForumTopic) => ForumTopic | null) =>
      setTopicsByWeek((s) => {
        const next: Record<string, ForumTopic[]> = {};
        for (const [w, list] of Object.entries(s)) {
          next[w] = list.flatMap((t) => {
            const result = fn(t);
            return result ? [result] : [];
          });
        }
        return next;
      }),
    [],
  );

  const mapPosts = useCallback(
    (topicId: string, fn: (list: ForumPost[]) => ForumPost[]) =>
      setPostsByTopic((s) => ({ ...s, [topicId]: fn(s[topicId] ?? []) })),
    [],
  );

  const mapPeople = useCallback(
    (id: string, fn: (list: ForumPerson[]) => ForumPerson[]) => setPeopleByWeek((s) => ({ ...s, [id]: fn(s[id] ?? []) })),
    [],
  );

  const loadWeeks = useCallback(async () => {
    const forums = await api<ApiForum[]>("/forums");
    const [lists, details] = await Promise.all([
      Promise.all(forums.map((f) => api<ForumTopic[]>(`/forums/${f.id}/topics`))),
      Promise.all(forums.map((f) => api<ApiForum>(`/forums/${f.id}`).catch(() => f))),
    ]);

    const topics = emptyWeeks();
    const byWeek: Record<string, ApiForum> = {};
    details.forEach((f, i) => {
      const key = weekKeyFor(f.position);
      byWeek[key] = f;
      topics[key] = lists[i];
    });

    const freshSettings = details
      .map((f): [string, ApiForum] => [weekKeyFor(f.position), f])
      .filter(([key]) => !loadedSettings.current.has(key));
    freshSettings.forEach(([key]) => loadedSettings.current.add(key));

    setForumsByWeek(byWeek);
    setTopicsByWeek(topics);
    if (freshSettings.length > 0) {
      setSettingsByWeek((s) => {
        const next = { ...s };
        for (const [key, f] of freshSettings) {
          next[key] = { ...getDefaultSettings(weekById(key)), ...(f.settings ?? {}), name: f.title, course: f.course };
        }
        return next;
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadWeeks()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load the forum");
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [loadWeeks]);

  const loadPosts = useCallback(
    async (topicId: string, force = false) => {
      const id = resolveId(topicId);
      if (!force && loadedTopics.current.has(id)) return;
      const pending = pendingTopics.current.get(id);
      if (pending && !force) return pending;

      const task = api<ApiThread>(`/topics/${id}`)
        .then(({ topic, posts }) => {
          loadedTopics.current.add(id);
          setPostsByTopic((s) => ({ ...s, [id]: posts }));
          mapTopics((t) => (t.id === id ? { ...t, ...topic, isUnread: false } : t));
        })
        .finally(() => pendingTopics.current.delete(id));
      pendingTopics.current.set(id, task);
      return task;
    },
    [mapTopics, resolveId],
  );

  const loadPeople = useCallback(
    async (id: string, force = false) => {
      const forumId = forumIdByWeek[id];
      if (!forumId) return;
      if (!force && loadedPeople.current.has(id)) return;
      const people = await api<ForumPerson[]>(`/forums/${forumId}/people`);
      loadedPeople.current.add(id);
      setPeopleByWeek((s) => ({ ...s, [id]: people }));
    },
    [forumIdByWeek],
  );

  const loadEvaluations = useCallback(
    async (id: string, force = false) => {
      const forumId = forumIdByWeek[id];
      if (!forumId) return;
      if (!force && loadedEvaluations.current.has(id)) return;
      const list = await api<Evaluation[]>(`/forums/${forumId}/evaluations`);
      loadedEvaluations.current.add(id);
      setEvaluationsByWeek((s) => ({
        ...s,
        [id]: Object.fromEntries(list.map((e): [string, Evaluation] => [e.personId, e])),
      }));
    },
    [forumIdByWeek],
  );

  useEffect(() => {
    loadPeople(weekId).catch(() => undefined);
    loadEvaluations(weekId).catch(() => undefined);
  }, [loadPeople, loadEvaluations, weekId]);

  const reconcile = useCallback(
    async (topicId: string) => {
      try {
        await loadWeeks();
        await loadPosts(topicId, true);
      } catch {
        return;
      }
    },
    [loadWeeks, loadPosts],
  );

  const run = useCallback(
    (key: string, task: () => Promise<unknown>, recover?: () => Promise<void>) => {
      const previous = chains.current.get(key) ?? Promise.resolve();
      const next = previous
        .then(task)
        .then(() => undefined)
        .catch(async (err: unknown) => {
          const message = err instanceof Error ? err.message : "Could not save your change";
          console.error("[forum]", message, err);
          setError(message);
          await (recover ? recover().catch(() => undefined) : reconcile(resolveId(key)));
        });
      chains.current.set(key, next);
      return next;
    },
    [reconcile, resolveId],
  );

  const value = useMemo<ForumStore>(() => {
    const settingsFor = (id: string) => settingsByWeek[id] ?? getDefaultSettings(weekById(id));

    return {
      now,
      ready,
      error,
      weekId,
      setWeekId,
      forumIdFor: (id) => forumIdByWeek[id],

      forumDetailFor: (id) => {
        const base = getForumDetail(weekById(id), settingsFor(id));
        const remote = forumsByWeek[id];
        const people = peopleByWeek[id];
        const learners = people?.filter((p) => p.role === "learner");
        return {
          ...base,
          id: remote?.id ?? base.id,
          title: remote?.title ?? base.title,
          course: remote?.course ?? base.course,
          instructor: remote?.instructor ?? base.instructor,
          postedCount: learners
            ? learners.filter((p) => p.posts.length > 0).length
            : (remote?.stats?.posted ?? base.postedCount),
          totalCount: learners ? learners.length : (remote?.stats?.learners ?? base.totalCount),
          reportedCount: remote
            ? (topicsByWeek[id] ?? []).reduce((n, t) => n + (t.reportCount ?? 0), 0)
            : base.reportedCount,
        };
      },

      topicsByWeek,

      findTopic: (topicId) => {
        const id = resolveId(topicId);
        for (const [w, list] of Object.entries(topicsByWeek)) {
          const topic = list.find((t) => t.id === id);
          if (topic) return { topic, weekId: w };
        }
        return null;
      },

      addTopic: (targetWeekId, topic, openingPost, attachmentIds) => {
        setTopicsByWeek((s) => ({ ...s, [targetWeekId]: [topic, ...(s[targetWeekId] ?? [])] }));
        setPostsByTopic((s) => ({ ...s, [topic.id]: [openingPost] }));
        const forumId = forumIdByWeek[targetWeekId];
        if (!forumId) return;
        run(topic.id, async () => {
          const created = await api<ForumTopic>(`/forums/${forumId}/topics`, {
            method: "POST",
            json: {
              title: topic.title,
              body: openingPost.body,
              group: topic.group || undefined,
              state: topic.state === "notice" ? "notice" : undefined,
              participation: topic.participation ?? undefined,
              attachmentIds: attachmentIds?.length ? attachmentIds : undefined,
            },
          });
          realIds.current.set(topic.id, created.id);
          if (topic.isPinned && !created.isPinned) {
            Object.assign(created, await api<ForumTopic>(`/topics/${created.id}`, { method: "PATCH", json: { isPinned: true } }));
          }
          setTopicsByWeek((s) => ({
            ...s,
            [targetWeekId]: (s[targetWeekId] ?? []).map((t) => (t.id === topic.id ? { ...t, ...created } : t)),
          }));
          setPostsByTopic((s) => {
            const next = { ...s };
            delete next[topic.id];
            return next;
          });
          await loadPosts(created.id, true);
        });
      },

      createTopic: async (targetWeekId, input) => {
        const forumId = forumIdByWeek[targetWeekId];
        if (!forumId) throw new Error("This week isn't available yet. Refresh and try again.");
        const created = await api<ForumTopic>(`/forums/${forumId}/topics`, {
          method: "POST",
          json: {
            title: input.title.trim(),
            body: input.body,
            group: input.group && input.group !== "all" ? input.group : undefined,
            participation: input.participation ?? undefined,
            attachmentIds: input.attachmentIds?.length ? input.attachmentIds : undefined,
          },
        });
        setTopicsByWeek((s) => ({ ...s, [targetWeekId]: [created, ...(s[targetWeekId] ?? [])] }));
        return created;
      },

      updateTopic: (topicId, patch) => {
        const id = resolveId(topicId);
        mapTopics((t) => (t.id === id ? { ...t, ...patch } : t));
        const body: Record<string, unknown> = {};
        for (const key of TOPIC_API_FIELDS) {
          if (key in patch) body[key] = patch[key] ?? null;
        }
        if (Object.keys(body).length === 0) return;
        run(id, async () => {
          const updated = await api<ForumTopic>(`/topics/${resolveId(id)}`, { method: "PATCH", json: body });
          mapTopics((t) => (t.id === updated.id ? { ...t, ...updated } : t));
        });
      },

      deleteTopic: (topicId) => {
        const id = resolveId(topicId);
        mapTopics((t) => (t.id === id ? null : t));
        setPostsByTopic((s) => {
          const next = { ...s };
          delete next[id];
          return next;
        });
        return run(id, () => api<void>(`/topics/${resolveId(id)}`, { method: "DELETE" }));
      },

      moveTopic: (topicId, targetWeekId) => {
        const id = resolveId(topicId);
        setTopicsByWeek((s) => {
          let moved: ForumTopic | undefined;
          const next: Record<string, ForumTopic[]> = {};
          for (const [w, list] of Object.entries(s)) {
            moved ??= list.find((t) => t.id === id);
            next[w] = list.filter((t) => t.id !== id);
          }
          if (moved) next[targetWeekId] = [{ ...moved, isPinned: false }, ...(next[targetWeekId] ?? [])];
          return next;
        });
        const forumId = forumIdByWeek[targetWeekId];
        if (!forumId) return;
        run(id, async () => {
          const moved = await api<ForumTopic>(`/topics/${id}/move`, { method: "POST", json: { forumId } });
          mapTopics((t) => (t.id === moved.id ? { ...t, ...moved } : t));
        });
      },

      loadPosts,

      postsFor: (topicId) => postsByTopic[resolveId(topicId)] ?? [],

      addPost: (post, attachmentIds) => {
        const topicId = resolveId(post.topicId);
        mapPosts(topicId, (list) => [...list, { ...post, topicId }]);
        mapTopics((t) => (t.id === topicId ? { ...t, replies: t.replies + 1, lastActivityAt: post.createdAt } : t));
        run(topicId, async () => {
          const created = await api<ForumPost>(`/topics/${resolveId(topicId)}/posts`, {
            method: "POST",
            json: {
              body: post.body,
              replyToId: post.replyToId ? resolveId(post.replyToId) : undefined,
              isPrivate: post.isPrivate || undefined,
              allowReplyBack: post.allowReplyBack,
              attachmentIds: attachmentIds?.length ? attachmentIds : undefined,
            },
          });
          realIds.current.set(post.id, created.id);
          mapPosts(topicId, (list) => list.map((p) => (p.id === post.id ? created : p)));
        });
      },

      updatePost: (topicId, postId, patch) => {
        const tId = resolveId(topicId);
        mapPosts(tId, (list) => list.map((p) => (p.id === postId ? { ...p, ...patch } : p)));

        if ("body" in patch && patch.body !== undefined) {
          run(tId, async () => {
            const updated = await api<ForumPost>(`/posts/${resolveId(postId)}`, {
              method: "PATCH",
              json: { body: patch.body, editReason: patch.editReason, hideEditTag: patch.hideEditTag },
            });
            mapPosts(tId, (list) => list.map((p) => (p.id === postId || p.id === updated.id ? { ...p, ...updated } : p)));
          });
        }

        if ("feedbackDetail" in patch && patch.feedbackDetail) {
          const detail = patch.feedbackDetail;
          run(tId, async () => {
            const updated = await api<ForumPost>(`/posts/${resolveId(postId)}/feedback`, {
              method: "PUT",
              json: {
                rating: detail.rating,
                criterion: detail.criterion,
                max: detail.max,
                marks: detail.marks,
                note: detail.note,
                visible: detail.visible,
              },
            });
            mapPosts(tId, (list) => list.map((p) => (p.id === postId || p.id === updated.id ? { ...p, ...updated } : p)));
          });
        }

        if ("bonusMarks" in patch && patch.bonusMarks) {
          const bonusMarks = patch.bonusMarks;
          run(tId, () =>
            api<ForumPost>(`/posts/${resolveId(postId)}/best-answer`, {
              method: "POST",
              json: { bonusMarks, markAnswered: true },
            }),
          );
        }
      },

      deletePost: (topicId, postId) => {
        const tId = resolveId(topicId);
        const target = postsByTopic[tId]?.find((p) => p.id === postId);
        mapPosts(tId, (list) => list.filter((p) => p.id !== postId));
        mapTopics((t) =>
          t.id !== tId
            ? t
            : {
                ...t,
                replies: Math.max(0, t.replies - 1),
                state: target?.isBestAnswer && t.state === "answered" ? "open" : t.state,
              },
        );
        run(tId, () => api<void>(`/posts/${resolveId(postId)}`, { method: "DELETE" }));
      },

      setBestAnswer: (topicId, postId) => {
        const tId = resolveId(topicId);
        const previous = postsByTopic[tId]?.find((p) => p.isBestAnswer);
        mapPosts(tId, (list) => list.map((p) => ({ ...p, isBestAnswer: p.id === postId })));
        mapTopics((t) => (t.id !== tId || t.state === "notice" ? t : { ...t, state: postId ? "answered" : "open" }));
        run(tId, async () => {
          if (postId) {
            await api<ForumPost>(`/posts/${resolveId(postId)}/best-answer`, { method: "POST", json: { markAnswered: true } });
          } else if (previous) {
            await api<ForumPost>(`/posts/${resolveId(previous.id)}/best-answer`, { method: "DELETE" });
          }
        });
      },

      reportPost: (topicId, postId, reason, details, reporterKey) => {
        const tId = resolveId(topicId);
        mapPosts(tId, (list) =>
          list.map((p) => (p.id === postId ? { ...p, reportedBy: [...(p.reportedBy ?? []), reporterKey] } : p)),
        );
        mapTopics((t) => (t.id === tId ? { ...t, reportCount: (t.reportCount ?? 0) + 1 } : t));
        run(tId, () => api(`/posts/${resolveId(postId)}/reports`, { method: "POST", json: { reason, details } }));
      },

      settingsFor,

      publishSettings: (id, settings) => {
        setSettingsByWeek((s) => ({ ...s, [id]: settings }));
        const forumId = forumIdByWeek[id];
        if (!forumId) return;
        run(
          `settings:${id}`,
          async () => {
            const updated = await api<ApiForum>(`/forums/${forumId}/settings`, { method: "PUT", json: { settings } });
            setForumsByWeek((s) => ({ ...s, [id]: { ...s[id], ...updated } }));
          },
          loadWeeks,
        );
      },

      loadPeople,

      peopleFor: (id) => peopleByWeek[id] ?? [],

      addPeople: (id, people) => mapPeople(id, (list) => [...people, ...list]),

      updatePerson: (id, personId, patch) => {
        mapPeople(id, (list) => list.map((p) => (p.id === personId ? { ...p, ...patch } : p)));
        const forumId = forumIdByWeek[id];
        if (!forumId) return;
        const recover = () => loadPeople(id, true);
        const body: Record<string, unknown> = {};
        if ("group" in patch) body.group = patch.group ?? null;
        if ("canPost" in patch) body.canPost = patch.canPost;
        if (patch.role === "learner" || patch.role === "observer") body.role = patch.role;

        if (Object.keys(body).length > 0) {
          run(
            `people:${personId}`,
            async () => {
              const updated = await api<ForumPerson | null>(`/forums/${forumId}/people/${personId}`, {
                method: "PATCH",
                json: body,
              });
              if (updated) mapPeople(id, (list) => list.map((p) => (p.id === personId ? updated : p)));
            },
            recover,
          );
        }

        if (patch.reminder === true) {
          run(
            `people:${personId}`,
            () => api(`/forums/${forumId}/people/${personId}/reminders`, { method: "POST", json: DEFAULT_REMINDER }),
            recover,
          );
        }
      },

      removePerson: (id, personId) => {
        mapPeople(id, (list) => list.filter((p) => p.id !== personId));
        const forumId = forumIdByWeek[id];
        if (!forumId) return;
        run(
          `people:${personId}`,
          () => api<void>(`/forums/${forumId}/people/${personId}`, { method: "DELETE" }),
          () => loadPeople(id, true),
        );
      },

      remindPerson: async (id, personId, input) => {
        const forumId = forumIdByWeek[id];
        if (!forumId) throw new Error("This week isn't available yet. Refresh and try again.");
        await api(`/forums/${forumId}/people/${personId}/reminders`, { method: "POST", json: input });
        mapPeople(id, (list) => list.map((p) => (p.id === personId ? { ...p, reminder: true } : p)));
      },

      messagePerson: async (id, personId, input) => {
        const forumId = forumIdByWeek[id];
        if (!forumId) throw new Error("This week isn't available yet. Refresh and try again.");
        await api(`/forums/${forumId}/people/${personId}/messages`, { method: "POST", json: input });
      },

      loadEvaluations,

      evaluationFor: (id, personId) => evaluationsByWeek[id]?.[personId],

      saveEvaluation: (id, evaluation) => {
        setEvaluationsByWeek((s) => ({
          ...s,
          [id]: { ...(s[id] ?? {}), [evaluation.personId]: evaluation },
        }));
        const forumId = forumIdByWeek[id];
        if (!forumId) return;
        const graded = evaluation.status === "evaluated" || evaluation.status === "published";
        run(
          `evaluation:${evaluation.personId}`,
          async () => {
            await api(`/forums/${forumId}/evaluations/${evaluation.personId}`, {
              method: "PUT",
              json: {
                status: evaluation.status,
                grade: evaluation.status === "pending" ? null : scoresOf(evaluation).total,
                data: evaluation,
              },
            });
            if (graded) await loadPeople(id, true);
          },
          () => loadEvaluations(id, true),
        );
      },
    };
  }, [
    now,
    ready,
    error,
    weekId,
    topicsByWeek,
    postsByTopic,
    settingsByWeek,
    peopleByWeek,
    evaluationsByWeek,
    forumsByWeek,
    forumIdByWeek,
    loadWeeks,
    loadPosts,
    loadPeople,
    loadEvaluations,
    mapPosts,
    mapTopics,
    mapPeople,
    resolveId,
    run,
  ]);

  return <ForumContext.Provider value={value}>{children}</ForumContext.Provider>;
}

export function useForum() {
  const ctx = useContext(ForumContext);
  if (!ctx) throw new Error("useForum must be used inside ForumProvider");
  return ctx;
}