import { useRef, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: {
    full_name?: string;
    email?: string;
  };
}

interface ChatMessageProps {
  message: Message;
  deleteMessage: (messageId: string) => Promise<void>;
  showDateSeparator?: boolean;
}

const ChatMessage = ({ message, deleteMessage, showDateSeparator = false }: ChatMessageProps) => {
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleToggleReaction = async (emoji: string) => {
    try {
      setShowReactions(false);
      const { data: existing } = await supabase
        .from('message_reactions' as any)
        .select('id')
        .eq('message_id', message.id)
        .eq('user_id', user?.id)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('message_reactions' as any)
          .delete()
          .eq('id', (existing as any).id);
      } else {
        await supabase
          .from('message_reactions' as any)
          .insert({ message_id: message.id, user_id: user?.id, emoji });
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const handleTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      setShowReactions(true);
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const displayName = useMemo(() => {
    if (message.profiles?.full_name && message.profiles.full_name.trim() !== '') {
      return message.profiles.full_name;
    }
    if (message.profiles?.email && message.profiles.email.trim() !== '') {
      return message.profiles.email.split('@')[0];
    }
    return 'Member';
  }, [message.profiles]);

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
      {showDateSeparator && (
        <div className="flex justify-center my-2">
          <div className="whatsapp-date-separator">
            {formatDate(message.created_at)}
          </div>
        </div>
      )}

      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}>
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          className={`whatsapp-bubble relative group/message select-none transition-transform active:scale-[0.98] ${isOwnMessage
            ? 'whatsapp-message-own'
            : 'whatsapp-message-other'
            }`}>
          {!isOwnMessage && (
            <p className="text-xs font-medium text-blue-600 mb-1">{displayName}</p>
          )}
          <p className="text-sm leading-relaxed break-words">{message.message}</p>

          <div className={`flex items-center justify-end space-x-1 mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
            <span className="whatsapp-timestamp">{formatTime(message.created_at)}</span>
            {isOwnMessage && (
              <div className="flex items-center space-x-1">
                <CheckCheck className="w-3 h-3" />
              </div>
            )}
          </div>

          <div className={cn(
            "absolute -bottom-10 flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-1 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 z-50 transition-all",
            showReactions ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible group-hover/message:opacity-100 group-hover/message:scale-100 group-hover/message:visible",
            isOwnMessage ? "right-0" : "left-0"
          )}>
            {['❤️', '👍', '😂', '🙏', '🔥', '😮'].map(emoji => (
              <button
                key={emoji}
                onClick={() => handleToggleReaction(emoji)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-all hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>

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
