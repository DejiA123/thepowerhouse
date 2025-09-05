
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Volume2, ChevronDown } from "lucide-react";

interface BibleBook {
  name: string;
  chapters: number;
  apiName: string;
}

interface BibleBookListProps {
  onBookSelect: (bookApiName: string) => void;
  onCancel?: () => void;
  onHistory?: () => void;
}

const bibleBooks = {
  "Old Testament": [
    { name: "Genesis", chapters: 50, apiName: "genesis" },
    { name: "Exodus", chapters: 40, apiName: "exodus" },
    { name: "Leviticus", chapters: 27, apiName: "leviticus" },
    { name: "Numbers", chapters: 36, apiName: "numbers" },
    { name: "Deuteronomy", chapters: 34, apiName: "deuteronomy" },
    { name: "Joshua", chapters: 24, apiName: "joshua" },
    { name: "Judges", chapters: 21, apiName: "judges" },
    { name: "Ruth", chapters: 4, apiName: "ruth" },
    { name: "1 Samuel", chapters: 31, apiName: "1-samuel" },
    { name: "2 Samuel", chapters: 24, apiName: "2-samuel" },
    { name: "1 Kings", chapters: 22, apiName: "1-kings" },
    { name: "2 Kings", chapters: 25, apiName: "2-kings" },
    { name: "1 Chronicles", chapters: 29, apiName: "1-chronicles" },
    { name: "2 Chronicles", chapters: 36, apiName: "2-chronicles" },
    { name: "Ezra", chapters: 10, apiName: "ezra" },
    { name: "Nehemiah", chapters: 13, apiName: "nehemiah" },
    { name: "Esther", chapters: 10, apiName: "esther" },
    { name: "Job", chapters: 42, apiName: "job" },
    { name: "Psalms", chapters: 150, apiName: "psalms" },
    { name: "Proverbs", chapters: 31, apiName: "proverbs" },
    { name: "Ecclesiastes", chapters: 12, apiName: "ecclesiastes" },
    { name: "Song of Solomon", chapters: 8, apiName: "song-of-solomon" },
    { name: "Isaiah", chapters: 66, apiName: "isaiah" },
    { name: "Jeremiah", chapters: 52, apiName: "jeremiah" },
    { name: "Lamentations", chapters: 5, apiName: "lamentations" },
    { name: "Ezekiel", chapters: 48, apiName: "ezekiel" },
    { name: "Daniel", chapters: 12, apiName: "daniel" },
    { name: "Hosea", chapters: 14, apiName: "hosea" },
    { name: "Joel", chapters: 3, apiName: "joel" },
    { name: "Amos", chapters: 9, apiName: "amos" },
    { name: "Obadiah", chapters: 1, apiName: "obadiah" },
    { name: "Jonah", chapters: 4, apiName: "jonah" },
    { name: "Micah", chapters: 7, apiName: "micah" },
    { name: "Nahum", chapters: 3, apiName: "nahum" },
    { name: "Habakkuk", chapters: 3, apiName: "habakkuk" },
    { name: "Zephaniah", chapters: 3, apiName: "zephaniah" },
    { name: "Haggai", chapters: 2, apiName: "haggai" },
    { name: "Zechariah", chapters: 14, apiName: "zechariah" },
    { name: "Malachi", chapters: 4, apiName: "malachi" }
  ],
  "New Testament": [
    { name: "Matthew", chapters: 28, apiName: "matthew" },
    { name: "Mark", chapters: 16, apiName: "mark" },
    { name: "Luke", chapters: 24, apiName: "luke" },
    { name: "John", chapters: 21, apiName: "john" },
    { name: "Acts", chapters: 28, apiName: "acts" },
    { name: "Romans", chapters: 16, apiName: "romans" },
    { name: "1 Corinthians", chapters: 16, apiName: "1-corinthians" },
    { name: "2 Corinthians", chapters: 13, apiName: "2-corinthians" },
    { name: "Galatians", chapters: 6, apiName: "galatians" },
    { name: "Ephesians", chapters: 6, apiName: "ephesians" },
    { name: "Philippians", chapters: 4, apiName: "philippians" },
    { name: "Colossians", chapters: 4, apiName: "colossians" },
    { name: "1 Thessalonians", chapters: 5, apiName: "1-thessalonians" },
    { name: "2 Thessalonians", chapters: 3, apiName: "2-thessalonians" },
    { name: "1 Timothy", chapters: 6, apiName: "1-timothy" },
    { name: "2 Timothy", chapters: 4, apiName: "2-timothy" },
    { name: "Titus", chapters: 3, apiName: "titus" },
    { name: "Philemon", chapters: 1, apiName: "philemon" },
    { name: "Hebrews", chapters: 13, apiName: "hebrews" },
    { name: "James", chapters: 5, apiName: "james" },
    { name: "1 Peter", chapters: 5, apiName: "1-peter" },
    { name: "2 Peter", chapters: 3, apiName: "2-peter" },
    { name: "1 John", chapters: 5, apiName: "1-john" },
    { name: "2 John", chapters: 1, apiName: "2-john" },
    { name: "3 John", chapters: 1, apiName: "3-john" },
    { name: "Jude", chapters: 1, apiName: "jude" },
    { name: "Revelation", chapters: 22, apiName: "revelation" }
  ]
};

export const BibleBookList = ({ onBookSelect, onCancel, onHistory }: BibleBookListProps) => {
  const [sortType, setSortType] = useState<'traditional' | 'alphabetical'>('traditional');
  const [isMounted, setIsMounted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Ref callback to ensure scroll is reset when ref is set
  const setScrollContainerRef = (element: HTMLDivElement | null) => {
    scrollContainerRef.current = element;
    if (element) {
      // Simple scroll reset to top
      element.scrollTop = 0;
    }
  };

  // Flatten all books into a single array
  const allBooks = [
    ...bibleBooks["Old Testament"],
    ...bibleBooks["New Testament"]
  ];



  // Ensure Genesis is always first in traditional order
  const ensureGenesisFirst = (books: typeof allBooks) => {
    if (sortType === 'traditional') {
      // Genesis should already be first, but let's make sure
      const genesisIndex = books.findIndex(book => book.name === 'Genesis');
      if (genesisIndex > 0) {
        const genesis = books.splice(genesisIndex, 1)[0];
        books.unshift(genesis);
      }
    }
    return books;
  };

  // Ensure scroll position is at the top when component mounts
  useLayoutEffect(() => {
    setIsMounted(true);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, []);



  // Force scroll to top when sort type changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [sortType]);

  // Sort books based on selected sort type
  const sortedBooks = ensureGenesisFirst([...allBooks].sort((a, b) => {
    if (sortType === 'alphabetical') {
      return a.name.localeCompare(b.name);
    }
    // Traditional order (keep original order)
    return 0;
  }));

  // Reset scroll whenever sortedBooks change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [sortedBooks]);

  return (
    <div className="bible-book-selection overscroll-contain">
      {/* Header Bar */}
      <div className="bible-book-header">
        <button 
          className="bible-book-cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <h1 className="bible-book-title">Books</h1>
        <button 
          className="bible-book-history"
          onClick={onHistory}
        >
          History
        </button>
      </div>

      {/* Book List - Vertical Layout */}
      <div 
        className="bible-book-list overflow-y-auto overscroll-contain" 
        ref={setScrollContainerRef}
        key={`book-list-${sortType}-${isMounted}`}
      >
                 {sortedBooks.map((book, index) => {
           const isGenesis = book.name === 'Genesis';
          return (
                         <button
               key={book.name}
               className={`bible-book-item ${isGenesis ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 shadow-sm' : ''}`}
               onClick={() => onBookSelect(book.apiName)}
               data-book={book.apiName}
               style={isGenesis ? { marginTop: '5px', paddingTop: '15px' } : {}}
             >
                             <span className={`bible-book-name ${isGenesis ? 'font-bold text-blue-700 dark:text-blue-300' : ''}`}>
                 {book.name}
               </span>
              <div className="bible-book-icons">
                <Volume2 className="bible-book-icon" />
                <ChevronDown className="bible-book-icon" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Sorting Options removed per request */}
    </div>
  );
};

export { bibleBooks };
