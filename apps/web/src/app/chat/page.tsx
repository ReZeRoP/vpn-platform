import { Suspense } from 'react';
import { Protected } from '@/components/protected';
import { Spinner } from '@/components/ui';
import { ChatView } from '@/components/chat/chat-view';

export default function ChatPage() {
  return (
    <Protected>
      <Suspense fallback={<Spinner />}>
        <ChatView />
      </Suspense>
    </Protected>
  );
}
