import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock } from "lucide-react";
import { bibleBooks } from "./BibleBookList";

interface BibleHistoryItem {
  book: string;
  chapter: number;
  timestamp: number;
}

interface BibleHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (book: string, chapter: number) => void;
}

export const BibleHistory = ({ isOpen, onClose, onNavigate }: BibleHistoryProps) => {
  const [history, setHistory] = useState<BibleHistoryItem[]>([]);

  useEffect(() => {
    // Load history from localStorage
    const savedHistory = localStorage.getItem('bibleReadingHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Error loading Bible history:', error);
      }
    }
  }, [isOpen]);

  const getBookDisplayName = (bookApiName: string) => {
    const allBooks = [...bibleBooks["Old Testament"], ...bibleBooks["New Testament"]];
    const book = allBooks.find(b => b.apiName === bookApiName);
    return book ? book.name : bookApiName;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) {
        return 'Yesterday';
      } else if (diffInDays < 7) {
        return `${diffInDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    }
  };

  const handleHistoryClick = (item: BibleHistoryItem) => {
    onNavigate(item.book, item.chapter);
    onClose();
  };

  const clearHistory = () => {
    localStorage.removeItem('bibleReadingHistory');
    setHistory([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Reading History</span>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-96">
          {history.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No reading history yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Start reading to see your history here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleHistoryClick(item)}
                  className="p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <span className="font-medium">
                        {getBookDisplayName(item.book)} {item.chapter}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {history.length > 0 && (
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" size="sm" onClick={clearHistory}>
              Clear History
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Helper function to add to Bible history
export const addToBibleHistory = (book: string, chapter: number) => {
  const historyItem: BibleHistoryItem = {
    book,
    chapter,
    timestamp: Date.now()
  };

  try {
    const savedHistory = localStorage.getItem('bibleReadingHistory');
    let history: BibleHistoryItem[] = savedHistory ? JSON.parse(savedHistory) : [];
    
    // Remove duplicate entries
    history = history.filter(item => !(item.book === book && item.chapter === chapter));
    
    // Add new item to the beginning
    history.unshift(historyItem);
    
    // Keep only the last 50 items
    history = history.slice(0, 50);
    
    localStorage.setItem('bibleReadingHistory', JSON.stringify(history));
  } catch (error) {
    console.error('Error saving Bible history:', error);
  }
};
