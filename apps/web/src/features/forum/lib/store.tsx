"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { MOCK_NOW, WEEKS, getDefaultSettings, seedPeopleByWeek, seedPostsByTopic, seedTopicsByWeek } from "./mock";
import { seedEvaluations } from "./grading";
import type { Evaluation, ForumPerson, ForumPost, ForumSettings, ForumTopic } from "./types";

interface ForumStore {
  now: number;
  weekId: string;
  setWeekId: (id: string) => void;
  topicsByWeek: Record<string, ForumTopic[]>;
  findTopic: (topicId: string) => { topic: ForumTopic; weekId: string } | null;
  addTopic: (weekId: string, topic: ForumTopic, openingPost: ForumPost) => void;
  updateTopic: (topicId: string, patch: Partial<ForumTopic>) => void;
  deleteTopic: (topicId: string) => void;
  moveTopic: (topicId: string, targetWeekId: string) => void;
  postsFor: (topicId: string) => ForumPost[];
  addPost: (post: ForumPost) => void;
  updatePost: (topicId: string, postId: string, patch: Partial<ForumPost>) => void;
  deletePost: (topicId: string, postId: string) => void;
  setBestAnswer: (topicId: string, postId: string | null) => void;
  settingsFor: (weekId: string) => ForumSettings;
  publishSettings: (weekId: string, settings: ForumSettings) => void;
  peopleFor: (weekId: string) => ForumPerson[];
  addPeople: (weekId: string, people: ForumPerson[]) => void;
  updatePerson: (weekId: string, personId: string, patch: Partial<ForumPerson>) => void;
  removePerson: (weekId: string, personId: string) => void;
  evaluationFor: (weekId: string, personId: string) => Evaluation | undefined;
  saveEvaluation: (weekId: string, evaluation: Evaluation) => void;
}

const ForumContext = createContext<ForumStore | null>(null);

export function ForumProvider({ children }: { children: ReactNode }) {
  const [peopleByWeek, setPeopleByWeek] = useState(seedPeopleByWeek);
  const [evaluationsByWeek, setEvaluationsByWeek] = useState<Record<string, Record<string, Evaluation>>>(() => Object.fromEntries(Object.entries(seedPeopleByWeek()).map(([w, people]): [string, Record<string, Evaluation>] => [w, seedEvaluations(people)])));
  const [weekId, setWeekId] = useState("w4");
  const [topicsByWeek, setTopicsByWeek] = useState(seedTopicsByWeek);
  const [postsByTopic, setPostsByTopic] = useState(seedPostsByTopic);
  const [settingsByWeek, setSettingsByWeek] = useState<Record<string, ForumSettings>>(() => Object.fromEntries(WEEKS.map((w): [string, ForumSettings] => [w.id, getDefaultSettings(w)])));

  const value = useMemo<ForumStore>(() => {
    const mapTopics = (fn: (t: ForumTopic) => ForumTopic | null) =>
      setTopicsByWeek((s) => {
        const next: Record<string, ForumTopic[]> = {};
        for (const [w, list] of Object.entries(s)) {
          next[w] = list.flatMap((t) => {
            const result = fn(t);
            return result ? [result] : [];
          });
        }
        return next;
      });

    const mapPosts = (topicId: string, fn: (list: ForumPost[]) => ForumPost[]) => setPostsByTopic((s) => ({ ...s, [topicId]: fn(s[topicId] ?? []) }));

    return {
      now: MOCK_NOW,
      weekId,
      setWeekId,
      topicsByWeek,

      findTopic: (topicId) => {
        for (const [w, list] of Object.entries(topicsByWeek)) {
          const topic = list.find((t) => t.id === topicId);
          if (topic) return { topic, weekId: w };
        }
        return null;
      },

      addTopic: (targetWeekId, topic, openingPost) => {
        setTopicsByWeek((s) => ({ ...s, [targetWeekId]: [topic, ...(s[targetWeekId] ?? [])] }));
        setPostsByTopic((s) => ({ ...s, [topic.id]: [openingPost] }));
      },

      updateTopic: (topicId, patch) => mapTopics((t) => (t.id === topicId ? { ...t, ...patch } : t)),

      deleteTopic: (topicId) => {
        mapTopics((t) => (t.id === topicId ? null : t));
        setPostsByTopic((s) => {
          const next = { ...s };
          delete next[topicId];
          return next;
        });
      },

      moveTopic: (topicId, targetWeekId) =>
        setTopicsByWeek((s) => {
          let moved: ForumTopic | undefined;
          const next: Record<string, ForumTopic[]> = {};
          for (const [w, list] of Object.entries(s)) {
            moved ??= list.find((t) => t.id === topicId);
            next[w] = list.filter((t) => t.id !== topicId);
          }
          if (moved) next[targetWeekId] = [{ ...moved, isPinned: false }, ...(next[targetWeekId] ?? [])];
          return next;
        }),

      postsFor: (topicId) => postsByTopic[topicId] ?? [],

      addPost: (post) => {
        mapPosts(post.topicId, (list) => [...list, post]);
        mapTopics((t) => (t.id === post.topicId ? { ...t, replies: t.replies + 1, lastActivityAt: post.createdAt } : t));
      },

      updatePost: (topicId, postId, patch) => mapPosts(topicId, (list) => list.map((p) => (p.id === postId ? { ...p, ...patch } : p))),

      deletePost: (topicId, postId) => {
        const target = postsByTopic[topicId]?.find((p) => p.id === postId);
        mapPosts(topicId, (list) => list.filter((p) => p.id !== postId));
        mapTopics((t) =>
          t.id !== topicId
            ? t
            : {
                ...t,
                replies: Math.max(0, t.replies - 1),
                state: target?.isBestAnswer && t.state === "answered" ? "open" : t.state,
              },
        );
      },

      setBestAnswer: (topicId, postId) => {
        mapPosts(topicId, (list) => list.map((p) => ({ ...p, isBestAnswer: p.id === postId })));
        mapTopics((t) => (t.id !== topicId || t.state === "notice" ? t : { ...t, state: postId ? "answered" : "open" }));
      },

      settingsFor: (id) => settingsByWeek[id] ?? getDefaultSettings(WEEKS.find((w) => w.id === id) ?? WEEKS[0]),

      publishSettings: (id, settings) => setSettingsByWeek((s) => ({ ...s, [id]: settings })),
      peopleFor: (id) => peopleByWeek[id] ?? [],

      addPeople: (id, people) => setPeopleByWeek((s) => ({ ...s, [id]: [...people, ...(s[id] ?? [])] })),

      updatePerson: (id, personId, patch) =>
        setPeopleByWeek((s) => ({
          ...s,
          [id]: (s[id] ?? []).map((p) => (p.id === personId ? { ...p, ...patch } : p)),
        })),

      removePerson: (id, personId) => setPeopleByWeek((s) => ({ ...s, [id]: (s[id] ?? []).filter((p) => p.id !== personId) })),
      evaluationFor: (id, personId) => evaluationsByWeek[id]?.[personId],

      saveEvaluation: (id, evaluation) =>
        setEvaluationsByWeek((s) => ({
          ...s,
          [id]: { ...(s[id] ?? {}), [evaluation.personId]: evaluation },
        })),
    };
  }, [weekId, topicsByWeek, postsByTopic, settingsByWeek, peopleByWeek, evaluationsByWeek]);

  return <ForumContext.Provider value={value}>{children}</ForumContext.Provider>;
}

export function useForum() {
  const ctx = useContext(ForumContext);
  if (!ctx) throw new Error("useForum must be used inside ForumProvider");
  return ctx;
}
