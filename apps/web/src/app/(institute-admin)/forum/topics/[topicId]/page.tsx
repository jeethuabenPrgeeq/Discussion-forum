import type { Metadata } from 'next';
import ThreadView from '@/features/forum/thread/ThreadView/ThreadView';

export const metadata: Metadata = { title: 'Topic · NeuroLXP' };

export default async function TopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  return <ThreadView topicId={topicId} />;
}