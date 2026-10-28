import { PrismaClient, type Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const HOUR = 60 * 60 * 1000;
const ago = (hours: number) => new Date(Date.now() - hours * HOUR);

interface SeedUser {
  key: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  password: string;
  group?: string;
}

const USERS: SeedUser[] = [
  { key: 'antony', email: 'antony.thomas@prgeeq.com', firstName: 'Antony', lastName: 'Thomas', role: 'CREATOR', password: 'Creator@123' },
  { key: 'rao', email: 'a.rao@prgeeq.com', firstName: 'Dr. A.', lastName: 'Rao', role: 'CREATOR', password: 'Creator@123' },
  { key: 'priya', email: 'priya.nair@college.edu', firstName: 'Priya', lastName: 'Nair', role: 'LEARNER', password: 'Learner@123', group: 'A' },
  { key: 'karan', email: 'karan.mehta@college.edu', firstName: 'Karan', lastName: 'Mehta', role: 'LEARNER', password: 'Learner@123', group: 'B' },
  { key: 'sara', email: 'sara.lewis@college.edu', firstName: 'Sara', lastName: 'Lewis', role: 'LEARNER', password: 'Learner@123', group: 'A' },
  { key: 'imran', email: 'imran.tariq@college.edu', firstName: 'Imran', lastName: 'Tariq', role: 'LEARNER', password: 'Learner@123', group: 'B' },
  { key: 'neha', email: 'neha.kapoor@college.edu', firstName: 'Neha', lastName: 'Kapoor', role: 'LEARNER', password: 'Learner@123', group: 'A' },
  { key: 'meera', email: 'meera.krishnan@college.edu', firstName: 'Meera', lastName: 'Krishnan', role: 'LEARNER', password: 'Learner@123', group: 'B' },
  { key: 'arjun', email: 'arjun.singh@college.edu', firstName: 'Arjun', lastName: 'Singh', role: 'LEARNER', password: 'Learner@123', group: 'A' },
];

const WEEKS = [
  { weekLabel: 'Week 1 - Arrays', title: 'Arrays in Practice' },
  { weekLabel: 'Week 2 - Stacks', title: 'Stacks Everywhere' },
  { weekLabel: 'Week 3 - Linked List', title: 'Linking It Together' },
  { weekLabel: 'Week 4 - Trees', title: 'Trees in the Wild' },
];

const SETTINGS = {
  postDue: '2026-10-18T23:59:00+05:30',
  repliesDue: '2026-10-22T23:59:00+05:30',
  cutoff: '2026-10-25T23:59:00+05:30',
  gradesOut: '2026-10-28T10:00:00+05:30',
  topicsEach: '1',
  repliesEach: '2',
  editWindow: '30',
  learnersStartTopics: true,
};

async function main() {
  await prisma.auditEntry.deleteMany();
  await prisma.report.deleteMany();
  await prisma.postFeedback.deleteMany();
  await prisma.question.deleteMany();
  await prisma.personMessage.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.post.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.forum.deleteMany();
  await prisma.user.deleteMany();

  const ids: Record<string, string> = {};
  for (const u of USERS) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        passwordHash: await bcrypt.hash(u.password, 10),
      },
    });
    ids[u.key] = user.id;
  }

  const forumIds: string[] = [];
  for (const [index, week] of WEEKS.entries()) {
    const forum = await prisma.forum.create({
      data: {
        ownerId: ids.rao,
        course: 'CS201 Data Structure',
        title: week.title,
        weekLabel: week.weekLabel,
        position: index + 1,
        settings: SETTINGS,
        enrollments: {
          create: USERS.filter((u) => u.role === 'LEARNER').map((u) => ({ userId: ids[u.key], group: u.group })),
        },
      },
    });
    forumIds.push(forum.id);
  }

  const trees = forumIds[3];

  const topic = async (data: {
    author: string;
    title: string;
    group: string | null;
    state?: 'OPEN' | 'ANSWERED' | 'NOTICE';
    isPinned?: boolean;
    isLocked?: boolean;
    participation?: 'REQUIRED' | 'OPTIONAL' | null;
    hoursAgo: number;
    posts: { author: string; body: string; hoursAgo: number; best?: boolean }[];
  }) => {
    const created = await prisma.topic.create({
      data: {
        forumId: trees,
        authorId: ids[data.author],
        title: data.title,
        group: data.group,
        state: data.state ?? 'OPEN',
        isPinned: data.isPinned ?? false,
        isLocked: data.isLocked ?? false,
        participation: data.participation ?? null,
        createdAt: ago(data.hoursAgo),
        lastActivityAt: ago(Math.min(...data.posts.map((p) => p.hoursAgo))),
      },
    });
    for (const p of data.posts) {
      await prisma.post.create({
        data: {
          topicId: created.id,
          authorId: ids[p.author],
          body: `<p>${p.body}</p>`,
          isBestAnswer: p.best ?? false,
          createdAt: ago(p.hoursAgo),
        },
      });
    }
  };

  await topic({
    author: 'priya',
    title: 'Best for a playlist app?',
    group: 'A',
    isPinned: true,
    participation: 'REQUIRED',
    hoursAgo: 120,
    posts: [
      { author: 'priya', body: 'Arrays win on random access. A playlist inserts and removes often, so linked lists skip the shifting.', hoursAgo: 120 },
      { author: 'rao', body: 'Good Start! add cache locality and one source', hoursAgo: 3 },
      { author: 'karan', body: 'Agreed, but dynamic arrays appeared in O(1) amortised', hoursAgo: 2 },
    ],
  });

  await topic({
    author: 'karan',
    title: 'Insertion time complexity',
    group: 'B',
    state: 'ANSWERED',
    participation: 'REQUIRED',
    hoursAgo: 96,
    posts: [
      { author: 'karan', body: 'Is inserting into a balanced BST always O(log n)?', hoursAgo: 96 },
      { author: 'sara', body: 'Yes for AVL and red-black trees, because rotations keep the height logarithmic.', hoursAgo: 6, best: true },
    ],
  });

  await topic({
    author: 'sara',
    title: 'Pointer memory overhead',
    group: 'A',
    isPinned: true,
    participation: 'OPTIONAL',
    hoursAgo: 72,
    posts: [{ author: 'sara', body: 'How much extra memory do child pointers add per node?', hoursAgo: 24 }],
  });

  await topic({
    author: 'imran',
    title: 'Singly vs doubly linked',
    group: 'B',
    isLocked: true,
    participation: 'OPTIONAL',
    hoursAgo: 150,
    posts: [{ author: 'imran', body: 'When is the extra back pointer worth it?', hoursAgo: 48 }],
  });

  await topic({
    author: 'rao',
    title: 'Share your example',
    group: null,
    state: 'NOTICE',
    hoursAgo: 200,
    posts: [{ author: 'rao', body: 'Post one real-world tree you use every day and explain why it is a tree.', hoursAgo: 72 }],
  });

  const playlist = await prisma.topic.findFirstOrThrow({ where: { forumId: trees, title: 'Best for a playlist app?' } });
  const flagged = await prisma.post.create({
    data: {
      topicId: playlist.id,
      authorId: ids.imran,
      body: '<p>Check out this cool sale on sneakers -stop deals example/ offer ,also tress are boring anyway.</p>',
      createdAt: ago(30),
    },
  });
  const report = await prisma.report.create({
    data: { postId: flagged.id, reporterId: ids.sara, reason: 'Off-topic', details: 'Advert, not about trees.' },
  });
  await prisma.auditEntry.create({ data: { reportId: report.id, text: 'Reported by Sara L as "Off-topic".' } });
  await prisma.topic.update({ where: { id: playlist.id }, data: { reportCount: 1 } });

  console.info(`Seeded ${USERS.length} users, ${WEEKS.length} forums, 5 topics and 1 report.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());