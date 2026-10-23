import type { Metadata } from 'next';
import TopicsView from '@/features/forum/topics/TopicsView/TopicsView';

export const metadata: Metadata = { title: 'Discussion Forum · NeuroLXP' };

export default function ForumPage() {
  return <TopicsView />;
}