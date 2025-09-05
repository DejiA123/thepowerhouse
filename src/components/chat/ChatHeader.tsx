
import { ArrowLeft, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  groupName: string;
  messageCount: number;
  onBack?: () => void;
}

const ChatHeader = ({ groupName, messageCount, onBack }: ChatHeaderProps) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-100 dark:border-indigo-800 bg-gradient-to-r from-white to-blue-50 dark:from-gray-900 dark:to-gray-800 backdrop-blur-sm">
      <div className="flex items-center space-x-3">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center shadow-md">
          <span className="text-sm font-bold text-white">
            {groupName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <div className="font-semibold text-gray-900 dark:text-gray-100">{groupName}</div>
          <div className="text-xs text-indigo-600 dark:text-indigo-400">Group • {messageCount} messages</div>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="p-2">
        <MoreVertical className="w-5 h-5" />
      </Button>
    </div>
  );
};

export default ChatHeader;
