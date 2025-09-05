
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { bibleBooks } from "./BibleBookList";
import { normalizeBookApiName } from "./bookUtils";

interface BibleChapterListProps {
  selectedBook: string;
  onChapterSelect: (chapter: number) => void;
  onBackToBooks: () => void;
}

export const BibleChapterList = ({ 
  selectedBook, 
  onChapterSelect, 
  onBackToBooks 
}: BibleChapterListProps) => {
  console.log('BibleChapterList: Rendering with selectedBook:', selectedBook);
  
  const allBooks = [...bibleBooks["Old Testament"], ...bibleBooks["New Testament"]];
  console.log('BibleChapterList: allBooks loaded:', allBooks.length, 'books');
  
  const normalized = normalizeBookApiName(selectedBook);
  const book = allBooks.find(b => b.apiName === normalized);
  console.log('BibleChapterList: Found book:', book);
  
  if (!book) {
    console.error('BibleChapterList: No book found for selectedBook:', selectedBook);
    return (
      <div className="bible-chapter-selection">
        <div className="bible-chapter-header">
          <button 
            className="bible-chapter-back"
            onClick={onBackToBooks}
          >
            Back to Books
          </button>
          <h1 className="bible-chapter-title">Book Not Found</h1>
          <div></div>
        </div>
        <div className="bible-chapter-list">
          <div className="text-center py-8">
            <p className="text-red-600">Error: Book "{selectedBook}" not found</p>
            <p className="text-gray-600 mt-2">Did you mean: "{normalized}"?</p>
          </div>
        </div>
      </div>
    );
  }

  console.log('BibleChapterList: Rendering chapters for book:', book.name, 'with', book.chapters, 'chapters');

  return (
    <div className="bible-chapter-selection overscroll-contain">
      {/* Header Bar */}
      <div className="bible-chapter-header">
        <button 
          className="bible-chapter-back"
          onClick={onBackToBooks}
        >
          Back to Books
        </button>
        <h1 className="bible-chapter-title">{book.name}</h1>
        <div></div> {/* Empty div for spacing */}
      </div>

      {/* Chapter List - Vertical Layout */}
      <div className="bible-chapter-list overflow-y-auto overscroll-contain">
        {Array.from({ length: book.chapters }, (_, i) => i + 1).map((chapter) => (
          <button
            key={chapter}
            className="bible-chapter-item"
            onClick={() => onChapterSelect(chapter)}
          >
            <span className="bible-chapter-number">Chapter {chapter}</span>
            <div className="bible-chapter-icons">
              <span className="bible-chapter-arrow">→</span>
            </div>
          </button>
        ))}
        {/* Bottom spacer so last chapter clears bottom nav */}
        <div style={{ height: '6rem' }} />
      </div>
    </div>
  );
};
