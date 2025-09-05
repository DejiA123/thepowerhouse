import { Send, Loader2, Plus, Paperclip, Camera, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  newMessage: string;
  setNewMessage: (value: string) => void;
  onSendMessage: () => void;
  loading: boolean;
  disabled: boolean;
}

const ChatInput = ({ 
  newMessage, 
  setNewMessage, 
  onSendMessage, 
  loading, 
  disabled 
}: ChatInputProps) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="flex-shrink-0 w-full p-4 border-t border-indigo-100 dark:border-indigo-800 bg-gradient-to-r from-white to-blue-50 dark:from-gray-900 dark:to-gray-800 backdrop-blur-sm">
      <div className="flex items-center space-x-2">
        {/* Plus button */}
        <Button variant="ghost" size="sm" className="p-2 text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50">
          <Plus className="w-5 h-5" />
        </Button>
        
        {/* Text input */}
        <div className="flex-1 relative">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message"
            disabled={loading || disabled}
            className="w-full px-4 py-2 border border-indigo-200 dark:border-indigo-700 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
          />
        </div>
        
        {/* Right side icons and send button */}
        <div className="flex items-center space-x-1">
          {/* Show attachment icons when no message, show send button when there's a message */}
          {newMessage.trim() ? (
            <Button 
              onClick={onSendMessage}
              disabled={loading || disabled || !newMessage.trim()}
              className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="p-2 text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50">
                <Paperclip className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2 text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50">
                <Camera className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2 text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50">
                <Mic className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
