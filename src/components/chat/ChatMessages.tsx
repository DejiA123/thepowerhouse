import { Loader2 } from "lucide-react";
import ChatMessage from "./ChatMessage";
import { Message } from "@/hooks/useGroupChat";
import { useMemo } from "react";

interface ChatMessagesProps {
  messages: Message[];
  initialLoading: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  deleteMessage: (messageId: string) => Promise<void>;
}

const ChatMessages = ({ messages, initialLoading, scrollRef, deleteMessage }: ChatMessagesProps) => {
  // Group messages by date and determine which ones should show date separators
  const messagesWithDateSeparators = useMemo(() => {
    if (!messages.length) return [];
    
    const grouped = [];
    let currentDate = '';
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const messageDate = new Date(message.created_at).toDateString();
      
      // Show date separator if this is a new date
      const showDateSeparator = messageDate !== currentDate;
      currentDate = messageDate;
      
      grouped.push({
        ...message,
        showDateSeparator
      });
    }
    
    return grouped;
  }, [messages]);

  if (initialLoading) {
    return (
      <div className="flex-1 overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900">
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900">
        <div className="h-full flex items-center justify-center">
          <p className="text-center text-indigo-600 dark:text-indigo-400 py-8 font-medium">
            No messages yet. Start the conversation!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900">
      <div 
        className="h-full overflow-y-auto px-4 py-2 relative" 
        ref={scrollRef}
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 50% 10%, rgba(59, 130, 246, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 30% 70%, rgba(168, 85, 247, 0.05) 0%, transparent 50%),
            linear-gradient(45deg, rgba(99, 102, 241, 0.03) 25%, transparent 25%, transparent 75%, rgba(99, 102, 241, 0.03) 75%),
            linear-gradient(-45deg, rgba(139, 92, 246, 0.03) 25%, transparent 25%, transparent 75%, rgba(139, 92, 246, 0.03) 75%),
            radial-gradient(ellipse at 60% 30%, rgba(59, 130, 246, 0.04) 0%, transparent 60%),
            radial-gradient(ellipse at 40% 90%, rgba(168, 85, 247, 0.04) 0%, transparent 60%),
            conic-gradient(from 45deg at 25% 25%, rgba(99, 102, 241, 0.02) 0deg, transparent 90deg, rgba(139, 92, 246, 0.02) 180deg, transparent 270deg),
            conic-gradient(from 225deg at 75% 75%, rgba(168, 85, 247, 0.02) 0deg, transparent 90deg, rgba(59, 130, 246, 0.02) 180deg, transparent 270deg)
          `,
          backgroundSize: '120px 120px, 120px 120px, 200px 200px, 200px 200px, 40px 40px, 40px 40px, 300px 300px, 300px 300px, 180px 180px, 180px 180px',
          backgroundPosition: '0 0, 60px 60px, 100px 50px, 150px 150px, 0 0, 20px 20px, 0 0, 150px 150px, 0 0, 90px 90px'
        }}
      >
        <div className="space-y-1">
          {messagesWithDateSeparators.map((message, index) => (
            <ChatMessage 
              key={message.id} 
              message={message} 
              deleteMessage={deleteMessage}
              showDateSeparator={message.showDateSeparator}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatMessages;
