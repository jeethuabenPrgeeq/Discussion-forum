import type { Post, PostFeedback, User } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';

const LEARNER_ACCENTS = ['red', 'purple', 'green', 'orange'] as const;

export type PostWithPeople = Post & { author: User; editedBy: User | null; feedback?: PostFeedback | null };

export const WITH_PEOPLE = { author: true, editedBy: true, feedback: true } as const;

export const shortName = (user: Pick<User, 'firstName' | 'lastName'>) => {
  if (!user.lastName) return user.firstName;
  if (user.firstName.endsWith('.')) return `${user.firstName} ${user.lastName}`;
  return `${user.firstName} ${user.lastName.charAt(0).toUpperCase()}`;
};

const accentFor = (user: User) => {
  if (user.role === 'CREATOR') return 'blue';
  const hash = [...user.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return LEARNER_ACCENTS[hash % LEARNER_ACCENTS.length];
};

export const toAuthorDto = (user: User) => ({
  id: user.id,
  name: shortName(user),
  role: user.role === 'CREATOR' ? 'instructor' : 'learner',
  accent: accentFor(user),
});

export const toFeedbackDto = (feedback: PostFeedback) => ({
  rating: feedback.rating.toLowerCase(),
  criterion: feedback.criterion,
  max: feedback.max,
  marks: feedback.marks,
  note: feedback.note,
  visible: feedback.visible,
});

const feedbackFor = (post: PostWithPeople, viewer?: AuthUser) => {
  if (!post.feedback) return undefined;
  if (!viewer || viewer.role === 'CREATOR') return post.feedback;
  return post.authorId === viewer.id && post.feedback.visible ? post.feedback : undefined;
};

export const toPostDto = (post: PostWithPeople, viewer?: AuthUser) => {
  const feedback = feedbackFor(post, viewer);
  return {
    id: post.id,
    topicId: post.topicId,
    author: toAuthorDto(post.author),
    body: post.body,
    createdAt: post.createdAt.toISOString(),
    editedAt: post.editedAt?.toISOString(),
    editedBy: post.editedBy ? (post.editedBy.role === 'CREATOR' ? 'instructor' : 'learner') : undefined,
    editReason: post.editReason ?? undefined,
    hideEditTag: post.hideEditTag,
    isBestAnswer: post.isBestAnswer,
    bonusMarks: post.bonusMarks ?? undefined,
    isPrivate: post.isPrivate,
    allowReplyBack: post.allowReplyBack,
    replyToId: post.replyToId ?? undefined,
    isHidden: post.hiddenAt !== null,
    feedback: feedback?.note || undefined,
    feedbackDetail: feedback ? toFeedbackDto(feedback) : undefined,
    attachments: [] as { name: string; size: number }[],
  };
};

export const canSeePost = (post: Post, userId: string, byId: Map<string, Post>) => {
  if (post.removedAt || post.hiddenAt) return false;
  if (!post.isPrivate || post.authorId === userId) return true;
  const target = post.replyToId ? byId.get(post.replyToId) : undefined;
  return target?.authorId === userId;
};