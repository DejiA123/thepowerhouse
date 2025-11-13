import { Message } from "@/hooks/useGroupChat";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Check, CheckCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ChatMessageProps {
  message: Message;
  deleteMessage: (messageId: string) => Promise<void>;
  showDateSeparator?: boolean;
}

const ChatMessage = ({ message, deleteMessage, showDateSeparator = false }: ChatMessageProps) => {
  const { user } = useAuth();
  
  const displayName = useMemo(() => {
    console.log('Getting display name for message:', message.id);
    
    // Try full_name first
    if (message.profiles?.full_name && message.profiles.full_name.trim() !== '') {
      return message.profiles.full_name;
    }
    
    // Try email as fallback (extract name part before @)
    if (message.profiles?.email && message.profiles.email.trim() !== '') {
      const emailName = message.profiles.email.split('@')[0];
      return emailName;
    }
    
    return 'Member';
  }, [message.profiles, message.user_id, message.id]);

  const isOwnMessage = user?.id === message.user_id;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
    }
  };

  return (
    <div className="group">
      {/* Date separator - only show if requested */}
      {showDateSeparator && (
        <div className="flex justify-center my-2">
          <div className="whatsapp-date-separator">
            {formatDate(message.created_at)}
          </div>
        </div>
      )}
      
      {/* Message bubble */}
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className={`whatsapp-bubble relative group/message ${
          isOwnMessage 
            ? 'whatsapp-message-own' 
            : 'whatsapp-message-other'
        }`}>
          {/* Sender name for other messages */}
          {!isOwnMessage && (
            <p className="text-xs font-medium text-blue-600 mb-1">{displayName}</p>
          )}
          {/* Message text */}
          <p className="text-sm leading-relaxed break-words">{message.message}</p>
          
          {/* Timestamp and status */}
          <div className={`flex items-center justify-end space-x-1 mt-1 ${
            isOwnMessage ? 'text-blue-100' : 'text-gray-500'
          }`}>
            <span className="whatsapp-timestamp">{formatTime(message.created_at)}</span>
            {isOwnMessage && (
              <div className="flex items-center space-x-1">
                <CheckCheck className="w-3 h-3" />
              </div>
            )}
          </div>
          
          {/* Delete button for own messages */}
          {isOwnMessage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMessage(message.id)}
              className="absolute -top-2 -right-2 opacity-0 group-hover/message:opacity-100 transition-opacity h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
