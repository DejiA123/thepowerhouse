import { Card, CardContent } from "@/components/ui/card";
import { useGroupChat } from "@/hooks/useGroupChat";
import ChatHeader from "./chat/ChatHeader";
import ChatMessages from "./chat/ChatMessages";
import ChatInput from "./chat/ChatInput";

interface GroupChatComponentProps {
  groupName: string;
  onBack?: () => void;
}

const GroupChatComponent = ({ groupName, onBack }: GroupChatComponentProps) => {
  const {
    messages,
    newMessage,
    setNewMessage,
    loading,
    initialLoading,
    scrollRef,
    user,
    sendMessage,
    deleteMessage,
    members
  } = useGroupChat(groupName);

  if (!groupName) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-center text-gray-500 dark:text-gray-400">No group selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900">
      {/* Header */}
      <ChatHeader 
        groupName={groupName} 
        messageCount={messages.length} 
        onBack={onBack}
      />
      
      {/* Messages */}
      <ChatMessages 
        messages={messages}
        initialLoading={initialLoading}
        scrollRef={scrollRef}
        deleteMessage={deleteMessage}
      />
      
      {/* Input */}
      <ChatInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={sendMessage}
        loading={loading}
        disabled={!user}
      />
    </div>
  );
};

export default GroupChatComponent;
