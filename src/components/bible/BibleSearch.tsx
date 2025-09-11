import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, BookOpen, Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { enhancedApiBibleService } from "@/services/enhancedApiBibleService";
import { bibleBooks } from "./BibleBookList";
import { useToast } from "@/hooks/use-toast";
import { normalizeBookApiName } from "./bookUtils";

interface BibleSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (book: string, chapter: number, verse?: number) => void;
  selectedVersion?: string;
}

interface SearchResult {
  book: string;      // apiName
  chapter: number;
  verse: number;
  text: string;
  bookName: string;  // display name
}

type Scope = 'all' | 'ot' | 'nt' | 'book';

type MatchType = 'contains' | 'phrase' | 'all' | 'any' | 'whole';

export const BibleSearch = ({ isOpen, onClose, onNavigate, selectedVersion }: BibleSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [scope, setScope] = useState<Scope>('all');
  const [scopeBook, setScopeBook] = useState<string>('genesis');
  const [matchType, setMatchType] = useState<MatchType>('contains');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [sortCanonically, setSortCanonically] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const { toast } = useToast();
  const runIdRef = useRef(0);

  const allBooks = [...bibleBooks["Old Testament"], ...bibleBooks["New Testament"]];
  const otSet = new Set(bibleBooks["Old Testament"].map(b => b.apiName));
  const ntBooks = bibleBooks["New Testament"];
  const otBooks = bibleBooks["Old Testament"];

  // Book name mapping for display
  const getBookDisplayName = (apiName: string): string => {
    // First try to find by apiName
    let book = allBooks.find(b => b.apiName === apiName);
    
    // If not found, try to find by normalized name
    if (!book) {
      const normalizedApiName = apiName.toLowerCase().replace(/[^a-z0-9]/g, '');
      book = allBooks.find(b => {
        const normalizedBookName = b.apiName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizedBookName === normalizedApiName;
      });
    }
    
    // If still not found, try common API abbreviations
    if (!book) {
      const abbreviationMap: Record<string, string> = {
        'gen': 'Genesis', 'exo': 'Exodus', 'lev': 'Leviticus', 'num': 'Numbers', 'deu': 'Deuteronomy',
        'jos': 'Joshua', 'jdg': 'Judges', 'rut': 'Ruth', '1sa': '1 Samuel', '2sa': '2 Samuel',
        '1ki': '1 Kings', '2ki': '2 Kings', '1ch': '1 Chronicles', '2ch': '2 Chronicles',
        'ezr': 'Ezra', 'neh': 'Nehemiah', 'est': 'Esther', 'job': 'Job', 'psa': 'Psalms',
        'pro': 'Proverbs', 'ecc': 'Ecclesiastes', 'sng': 'Song of Solomon', 'isa': 'Isaiah',
        'jer': 'Jeremiah', 'lam': 'Lamentations', 'ezk': 'Ezekiel', 'dan': 'Daniel',
        'hos': 'Hosea', 'jol': 'Joel', 'amo': 'Amos', 'oba': 'Obadiah', 'jon': 'Jonah',
        'mic': 'Micah', 'nam': 'Nahum', 'hab': 'Habakkuk', 'zep': 'Zephaniah',
        'hag': 'Haggai', 'zec': 'Zechariah', 'mal': 'Malachi', 'mat': 'Matthew',
        'mrk': 'Mark', 'luk': 'Luke', 'jhn': 'John', 'act': 'Acts', 'rom': 'Romans',
        '1co': '1 Corinthians', '2co': '2 Corinthians', 'gal': 'Galatians', 'eph': 'Ephesians',
        'php': 'Philippians', 'col': 'Colossians', '1th': '1 Thessalonians', '2th': '2 Thessalonians',
        '1ti': '1 Timothy', '2ti': '2 Timothy', 'tit': 'Titus', 'phm': 'Philemon',
        'heb': 'Hebrews', 'jas': 'James', '1pe': '1 Peter', '2pe': '2 Peter',
        '1jn': '1 John', '2jn': '2 John', '3jn': '3 John', 'jud': 'Jude', 'rev': 'Revelation'
      };
      
      const bookName = abbreviationMap[apiName.toLowerCase()];
      if (bookName) {
        return bookName;
      }
    }
    
    return book ? book.name : apiName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Highlight search terms in text
  const highlight = (text: string, query: string): string => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, caseSensitive ? 'g' : 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>');
  };

  // Canonical book order for sorting
  const getBookOrder = (bookName: string): number => {
    const order: Record<string, number> = {
      'Genesis': 1, 'Exodus': 2, 'Leviticus': 3, 'Numbers': 4, 'Deuteronomy': 5,
      'Joshua': 6, 'Judges': 7, 'Ruth': 8, '1 Samuel': 9, '2 Samuel': 10,
      '1 Kings': 11, '2 Kings': 12, '1 Chronicles': 13, '2 Chronicles': 14,
      'Ezra': 15, 'Nehemiah': 16, 'Esther': 17, 'Job': 18, 'Psalms': 19,
      'Proverbs': 20, 'Ecclesiastes': 21, 'Song of Solomon': 22, 'Isaiah': 23,
      'Jeremiah': 24, 'Lamentations': 25, 'Ezekiel': 26, 'Daniel': 27,
      'Hosea': 28, 'Joel': 29, 'Amos': 30, 'Obadiah': 31, 'Jonah': 32,
      'Micah': 33, 'Nahum': 34, 'Habakkuk': 35, 'Zephaniah': 36,
      'Haggai': 37, 'Zechariah': 38, 'Malachi': 39, 'Matthew': 40,
      'Mark': 41, 'Luke': 42, 'John': 43, 'Acts': 44, 'Romans': 45,
      '1 Corinthians': 46, '2 Corinthians': 47, 'Galatians': 48,
      'Ephesians': 49, 'Philippians': 50, 'Colossians': 51,
      '1 Thessalonians': 52, '2 Thessalonians': 53, '1 Timothy': 54,
      '2 Timothy': 55, 'Titus': 56, 'Philemon': 57, 'Hebrews': 58,
      'James': 59, '1 Peter': 60, '2 Peter': 61, '1 John': 62,
      '2 John': 63, '3 John': 64, 'Jude': 65, 'Revelation': 66
    };
    return order[bookName] ?? 999;
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const currentRun = ++runIdRef.current;

    try {
      console.log('🔍 BibleSearch: Starting search with settings:', {
        query,
        scope,
        scopeBook,
        matchType,
        caseSensitive,
        sortCanonically,
        selectedVersion
      });

      // Search the entire Bible using the API
      const results = await enhancedApiBibleService.search(
        selectedVersion || 'de4e12af7f28f599-02',
        query
      );

      console.log('🔍 BibleSearch: Raw API results:', results.length);

      // Convert API results to our format and apply scope filtering
      let filteredResults: SearchResult[] = results.map(result => {
        // Find the book name from the API result
        const bookName = getBookDisplayName(result.book);
        return {
          book: result.book,
          chapter: result.chapter,
          verse: typeof result.verse === 'string' ? parseInt(result.verse) || 1 : result.verse,
          text: result.text,
          bookName: bookName
        };
      });

      // Apply scope filtering
      if (scope === 'ot') {
        filteredResults = filteredResults.filter(result => otSet.has(result.book));
      } else if (scope === 'nt') {
        filteredResults = filteredResults.filter(result => !otSet.has(result.book));
      } else if (scope === 'book') {
        filteredResults = filteredResults.filter(result => result.book === scopeBook);
      }

      console.log('🔍 BibleSearch: Results after scope filtering:', filteredResults.length);

      // Apply match type filtering
      if (matchType === 'phrase') {
        const exactQuery = caseSensitive ? query : query.toLowerCase();
        filteredResults = filteredResults.filter(result => {
          const text = caseSensitive ? result.text : result.text.toLowerCase();
          return text.includes(exactQuery);
        });
      } else if (matchType === 'all') {
        const words = query.split(/\s+/).map(w => caseSensitive ? w : w.toLowerCase());
        filteredResults = filteredResults.filter(result => {
          const text = caseSensitive ? result.text : result.text.toLowerCase();
          return words.every(word => text.includes(word));
        });
      } else if (matchType === 'any') {
        const words = query.split(/\s+/).map(w => caseSensitive ? w : w.toLowerCase());
        filteredResults = filteredResults.filter(result => {
          const text = caseSensitive ? result.text : result.text.toLowerCase();
          return words.some(word => text.includes(word));
        });
      } else if (matchType === 'whole') {
        const words = query.split(/\s+/).map(w => caseSensitive ? w : w.toLowerCase());
        filteredResults = filteredResults.filter(result => {
          const text = caseSensitive ? result.text : result.text.toLowerCase();
          return words.some(word => {
            const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
            return regex.test(text);
          });
        });
      }
      // 'contains' is the default and doesn't need additional filtering

      console.log('🔍 BibleSearch: Results after match type filtering:', filteredResults.length);

      // Sort results canonically if requested
      if (sortCanonically && filteredResults.length > 0) {
        console.log('🔍 BibleSearch: Sorting canonically...');
        filteredResults.sort((a, b) => {
          const orderA = getBookOrder(a.bookName);
          const orderB = getBookOrder(b.bookName);
          if (orderA !== orderB) return orderA - orderB;
          if (a.chapter !== b.chapter) return a.chapter - b.chapter;
          return a.verse - b.verse;
        });
        console.log('🔍 BibleSearch: Canonically sorted results');
      }

      if (runIdRef.current === currentRun) {
        setSearchResults(filteredResults);
        console.log('🔍 BibleSearch: Final results set:', filteredResults.length);
      }
    } catch (error) {
      console.error('🔍 BibleSearch: Search error:', error);
      if (runIdRef.current === currentRun) {
        toast({
          title: "Search Error",
          description: "Failed to search the Bible. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      if (runIdRef.current === currentRun) setIsSearching(false);
    }
  };

  // Debounce search on input
  useEffect(() => {
    if (!isOpen) return;
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); return; }
    const t = setTimeout(() => { handleSearch(); }, 450);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, scope, scopeBook, matchType, caseSensitive, sortCanonically, selectedVersion, isOpen]);

  const handleResultClick = (result: SearchResult) => {
    onNavigate(result.book, result.chapter, result.verse);
    onClose();
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-[100] bg-black/80" style={{ pointerEvents: 'none' }} />
        <DialogContent className="w-full h-[calc(100vh-80px)] max-w-none max-h-none m-0 rounded-none flex flex-col z-[101] bg-background" style={{ zIndex: 101, pointerEvents: 'auto' }}>
          <DialogHeader className="pb-4 pt-2">
            <DialogTitle className="flex items-center space-x-2 text-lg">
            <Search className="w-5 h-5" />
              <span>Bible Search</span>
          </DialogTitle>
        </DialogHeader>
          
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Search verses, phrases, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="flex-1"
            />
            <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

            {/* Advanced options toggle */}
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters</span>
                </div>
                {showAdvancedOptions ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              
              {showAdvancedOptions && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border-t">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Settings2 className="w-3 h-3" /> Scope
              </div>
              <Select value={scope} onValueChange={(v: Scope) => setScope(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Whole Bible</SelectItem>
                  <SelectItem value="ot">Old Testament</SelectItem>
                  <SelectItem value="nt">New Testament</SelectItem>
                  <SelectItem value="book">Specific Book</SelectItem>
                </SelectContent>
              </Select>
              {scope === 'book' && (
                <Select value={scopeBook} onValueChange={(v: string) => setScopeBook(v)}>
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allBooks.map(b => (
                      <SelectItem key={b.apiName} value={b.apiName}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Match Type</div>
              <Select value={matchType} onValueChange={(v: MatchType) => setMatchType(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="phrase">Exact Phrase</SelectItem>
                  <SelectItem value="all">All Words</SelectItem>
                  <SelectItem value="any">Any Word</SelectItem>
                  <SelectItem value="whole">Whole Word</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 mt-2">
                <Checkbox id="cs" checked={caseSensitive} onCheckedChange={(v) => setCaseSensitive(!!v)} />
                <label htmlFor="cs" className="text-xs text-muted-foreground">Case sensitive</label>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Checkbox id="sort" checked={sortCanonically} onCheckedChange={(v) => setSortCanonically(!!v)} />
                <label htmlFor="sort" className="text-xs text-muted-foreground">Sort canonically</label>
              </div>
            </div>
                </div>
              )}
          </div>
        </form>

        {searchResults.length > 0 && (
          <div className="text-sm text-muted-foreground mt-2">
              <span>Showing {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</span>
          </div>
        )}

          <ScrollArea className="flex-1 mt-2">
          <div className="space-y-2">
            {searchResults.map((result, index) => (
              <div
                key={`${result.book}-${result.chapter}-${result.verse}-${index}`}
                onClick={() => handleResultClick(result)}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-2 mb-1">
                  <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">
                    {result.bookName} {result.chapter}:{result.verse}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: highlight(result.text, searchQuery) }} />
              </div>
            ))}
            {isSearching && (
              <div className="text-xs text-muted-foreground p-2">Searching...</div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};