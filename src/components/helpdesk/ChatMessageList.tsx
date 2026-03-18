import { RefObject } from 'react';
import { MessageBubble } from './MessageBubble';
import type { Message } from '@/pages/dashboard/HelpDesk';

interface ChatMessageListProps {
  chatMessages: Message[];
  loading: boolean;
  bottomRef: RefObject<HTMLDivElement>;
  instanceId?: string;
  agentNamesMap?: Record<string, string>;
}

export const ChatMessageList = ({ chatMessages, loading, bottomRef, instanceId, agentNamesMap }: ChatMessageListProps) => (
  <div className="flex-1 overflow-y-auto p-4">
    {loading ? (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    ) : chatMessages.length === 0 ? (
      <div className="text-center text-muted-foreground py-12 text-sm">
        Nenhuma mensagem ainda
      </div>
    ) : (
      <div className="space-y-2">
        {chatMessages.map(msg => (
          <MessageBubble key={msg.id} message={msg} instanceId={instanceId} agentNamesMap={agentNamesMap} />
        ))}
      </div>
    )}
    <div ref={bottomRef} />
  </div>
);
