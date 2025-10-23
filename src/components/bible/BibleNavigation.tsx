
import { Button } from "@/components/ui/button";
import { ChevronLeft, Volume2 } from "lucide-react";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";

interface BibleNavigationProps {
  selectedBook?: string;
  selectedChapter?: number;
  onBookChange?: (book: string) => void;
  onChapterChange?: (chapter: number) => void;
  onBackToBooks?: () => void;
  onBackToChapters?: () => void;
}

export const BibleNavigation = ({ 
  selectedBook, 
  selectedChapter, 
  onBackToBooks, 
  onBackToChapters 
}: BibleNavigationProps) => {
  const { preferences } = useBiblePreferences();

  if (selectedChapter && selectedBook) {
    return (
      <div className="flex items-center justify-between will-change-transform">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={onBackToChapters}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Chapters
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedBook} Chapter {selectedChapter}
          </span>
        </div>
        
        {/* Audio Settings Quick Access */}
        <div className="flex items-center space-x-2">
          <div className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
            <Volume2 className="w-3 h-3 inline mr-1" />
            Pitch: {preferences.pitch.toFixed(2)} | Speed: {preferences.rate.toFixed(2)}x
          </div>
        </div>
      </div>
    );
  }

  if (selectedBook) {
    return (
      <div className="flex items-center space-x-2 mb-4">
        <Button variant="outline" size="sm" onClick={onBackToBooks}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Books
        </Button>
        <span className="text-sm text-muted-foreground">{selectedBook}</span>
      </div>
    );
  }

  return (
    <div className="text-center mb-6">
      <h1 className="text-3xl font-bold text-foreground">The Bible</h1>
      <p className="text-muted-foreground mt-2">Choose a book to begin reading</p>
    </div>
  );
};
