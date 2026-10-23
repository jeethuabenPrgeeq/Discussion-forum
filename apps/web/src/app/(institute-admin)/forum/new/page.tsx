import type { Metadata } from 'next';
import NewTopicView from '@/features/forum/topics/NewTopicView/NewTopicView';

export const metadata: Metadata = { title: 'New Topic · NeuroLXP' };

export default function NewTopicPage() {
  return <NewTopicView />;
}