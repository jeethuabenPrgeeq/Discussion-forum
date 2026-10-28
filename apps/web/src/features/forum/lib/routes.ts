export const FORUM_BASE = '/forum';

export const LEARNER_FORUM_BASE = '/learner/forum';

export const topicHref = (topicId: string) => `${FORUM_BASE}/topics/${topicId}`;

export const learnerTopicHref = (topicId: string) => `${LEARNER_FORUM_BASE}/topics/${topicId}`;