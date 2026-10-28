import { ForumProvider } from "@/features/forum/lib/store";
import LearnerShell from "@/features/forum/learner/LearnerShell/LearnerShell";

export default function LearnerForumPage() {
  return (
    <ForumProvider>
      <LearnerShell />
    </ForumProvider>
  );
}