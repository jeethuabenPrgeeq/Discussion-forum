import { ForumProvider } from '@/features/forum/lib/store';
import ThreadView from '@/features/forum/thread/ThreadView/ThreadView';

export default async function LearnerTopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  return (
    <ForumProvider>
      <ThreadView topicId={topicId} viewer />
    </ForumProvider>
  );
}