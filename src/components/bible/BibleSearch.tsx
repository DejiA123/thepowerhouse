import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, BookOpen, Settings2, ChevronDown, ChevronUp, X } from "lucide-react";
import { enhancedApiBibleService } from "@/services/enhancedApiBibleService";
import { bibleBooks } from "./BibleBookList";
import { useToast } from "@/hooks/use-toast";
import { normalizeBookApiName } from "./bookUtils";
import DOMPurify from "dompurify";

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

  // API.Bible book ID to our apiName mapping
  const apiBibleToApiName: Record<string, string> = {
    'GEN': 'genesis', 'EXO': 'exodus', 'LEV': 'leviticus', 'NUM': 'numbers',
    'DEU': 'deuteronomy', 'JOS': 'joshua', 'JDG': 'judges', 'RUT': 'ruth',
    '1SA': '1-samuel', '2SA': '2-samuel', '1KI': '1-kings', '2KI': '2-kings',
    '1CH': '1-chronicles', '2CH': '2-chronicles', 'EZR': 'ezra', 'NEH': 'nehemiah',
    'EST': 'esther', 'JOB': 'job', 'PSA': 'psalms', 'PRO': 'proverbs',
    'ECC': 'ecclesiastes', 'SNG': 'song-of-solomon', 'ISA': 'isaiah',
    'JER': 'jeremiah', 'LAM': 'lamentations', 'EZK': 'ezekiel', 'DAN': 'daniel',
    'HOS': 'hosea', 'JOL': 'joel', 'AMO': 'amos', 'OBA': 'obadiah',
    'JON': 'jonah', 'MIC': 'micah', 'NAM': 'nahum', 'HAB': 'habakkuk',
    'ZEP': 'zephaniah', 'HAG': 'haggai', 'ZEC': 'zechariah', 'MAL': 'malachi',
    'MAT': 'matthew', 'MRK': 'mark', 'LUK': 'luke', 'JHN': 'john',
    'ACT': 'acts', 'ROM': 'romans', '1CO': '1-corinthians', '2CO': '2-corinthians',
    'GAL': 'galatians', 'EPH': 'ephesians', 'PHP': 'philippians', 'COL': 'colossians',
    '1TH': '1-thessalonians', '2TH': '2-thessalonians', '1TI': '1-timothy', '2TI': '2-timothy',
    'TIT': 'titus', 'PHM': 'philemon', 'HEB': 'hebrews', 'JAS': 'james',
    '1PE': '1-peter', '2PE': '2-peter', '1JN': '1-john', '2JN': '2-john',
    '3JN': '3-john', 'JUD': 'jude', 'REV': 'revelation'
  };

  // Function to normalize book ID from API to our format
  const normalizeBookId = (bookId: string): string => {
    // First try direct mapping
    if (apiBibleToApiName[bookId]) {
      return apiBibleToApiName[bookId];
    }

    // Try case-insensitive mapping
    const upperBookId = bookId.toUpperCase();
    if (apiBibleToApiName[upperBookId]) {
      return apiBibleToApiName[upperBookId];
    }

    // Try to find by partial match in our book list
    const normalizedId = bookId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = allBooks.find(book => {
      const normalizedApiName = book.apiName.toLowerCase().replace(/[^a-z0-9]/g, '');
      return normalizedApiName === normalizedId;
    });

    return found ? found.apiName : bookId.toLowerCase();
  };

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

  // Highlight search terms in text with XSS protection
  const highlight = (text: string, query: string): string => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, caseSensitive ? 'g' : 'gi');
    const highlighted = text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>');
    // Sanitize to prevent XSS attacks - only allow mark tags with class attribute
    return DOMPurify.sanitize(highlighted, { ALLOWED_TAGS: ['mark'], ALLOWED_ATTR: ['class'] });
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
      console.log('🔍 BibleSearch: Sample API result:', results[0]);
      console.log('🔍 BibleSearch: OT Set:', Array.from(otSet));
      console.log('🔍 BibleSearch: Sample normalized book IDs:', results.slice(0, 5).map(r => ({ original: r.book, normalized: normalizeBookId(r.book) })));

      // Convert API results to our format and apply scope filtering
      let filteredResults: SearchResult[] = results.map(result => {
        // Normalize the book ID from API format to our format
        const normalizedBookId = normalizeBookId(result.book);
        const bookName = getBookDisplayName(normalizedBookId);
        return {
          book: normalizedBookId, // Use normalized book ID for filtering
          chapter: result.chapter,
          verse: typeof result.verse === 'string' ? parseInt(result.verse) || 1 : result.verse,
          text: result.text,
          bookName: bookName
        };
      });

      // Apply scope filtering
      console.log('🔍 BibleSearch: Applying scope filter:', scope);
      if (scope === 'ot') {
        const beforeCount = filteredResults.length;
        filteredResults = filteredResults.filter(result => {
          const isOT = otSet.has(result.book);
          console.log(`🔍 BibleSearch: Book ${result.book} is OT: ${isOT}`);
          return isOT;
        });
        console.log(`🔍 BibleSearch: OT filtering: ${beforeCount} -> ${filteredResults.length}`);
      } else if (scope === 'nt') {
        const beforeCount = filteredResults.length;
        filteredResults = filteredResults.filter(result => {
          const isNT = !otSet.has(result.book);
          console.log(`🔍 BibleSearch: Book ${result.book} is NT: ${isNT}`);
          return isNT;
        });
        console.log(`🔍 BibleSearch: NT filtering: ${beforeCount} -> ${filteredResults.length}`);
      } else if (scope === 'book') {
        const beforeCount = filteredResults.length;
        filteredResults = filteredResults.filter(result => {
          const matches = result.book === scopeBook;
          console.log(`🔍 BibleSearch: Book ${result.book} matches ${scopeBook}: ${matches}`);
          return matches;
        });
        console.log(`🔍 BibleSearch: Book filtering: ${beforeCount} -> ${filteredResults.length}`);
      }

      console.log('🔍 BibleSearch: Results after scope filtering:', filteredResults.length);

      // Apply match type filtering
      console.log('🔍 BibleSearch: Applying match type filter:', matchType);
      const beforeMatchCount = filteredResults.length;

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

      console.log(`🔍 BibleSearch: Match type filtering: ${beforeMatchCount} -> ${filteredResults.length}`);
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
      <DialogContent
        className="w-full h-[100dvh] max-w-none m-0 rounded-none flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-none p-0 overflow-hidden [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0 pb-6 pt-[calc(1rem+env(safe-area-inset-top))] px-8 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
              <Search className="w-6 h-6 text-primary" />
              Bible Search
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-700/50 -mr-2"
            >
              <X className="w-6 h-6 text-slate-500" />
            </Button>
          </div>
          <DialogDescription className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Search for verses, phrases, or topics
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col p-8 overflow-hidden">
          <div className="max-w-2xl mx-auto w-full flex flex-col h-full space-y-6">
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Search verses, phrases, or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
              <div className="border rounded-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
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
                        <SelectTrigger className="w-full hover:bg-muted/50 transition-colors cursor-pointer">
                          <SelectValue placeholder="Select scope">
                            {scope === 'all' && 'Whole Bible'}
                            {scope === 'ot' && 'Old Testament'}
                            {scope === 'nt' && 'New Testament'}
                            {scope === 'book' && 'Specific Book'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-[250] max-h-[200px]">
                          <SelectItem value="all">Whole Bible</SelectItem>
                          <SelectItem value="ot">Old Testament</SelectItem>
                          <SelectItem value="nt">New Testament</SelectItem>
                          <SelectItem value="book">Specific Book</SelectItem>
                        </SelectContent>
                      </Select>
                      {scope === 'book' && (
                        <Select value={scopeBook} onValueChange={(v: string) => setScopeBook(v)}>
                          <SelectTrigger className="w-full mt-2 hover:bg-muted/50 transition-colors cursor-pointer">
                            <SelectValue placeholder="Select book">
                              {allBooks.find(b => b.apiName === scopeBook)?.name || 'Select book'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="z-[250] max-h-[200px]">
                            {allBooks.map(b => (
                              <SelectItem key={b.apiName} value={b.apiName}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        Match Type
                      </div>
                      <Select value={matchType} onValueChange={(v: MatchType) => setMatchType(v)}>
                        <SelectTrigger className="w-full hover:bg-muted/50 transition-colors cursor-pointer">
                          <SelectValue placeholder="Select match type">
                            {matchType === 'contains' && 'Contains'}
                            {matchType === 'phrase' && 'Exact Phrase'}
                            {matchType === 'all' && 'All Words'}
                            {matchType === 'any' && 'Any Word'}
                            {matchType === 'whole' && 'Whole Word'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-[250] max-h-[200px]">
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="phrase">Exact Phrase</SelectItem>
                          <SelectItem value="all">All Words</SelectItem>
                          <SelectItem value="any">Any Word</SelectItem>
                          <SelectItem value="whole">Whole Word</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2">
                          <Checkbox id="cs" checked={caseSensitive} onCheckedChange={(v) => setCaseSensitive(!!v)} />
                          <label htmlFor="cs" className="text-xs text-muted-foreground cursor-pointer">Case sensitive</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="sort" checked={sortCanonically} onCheckedChange={(v) => setSortCanonically(!!v)} />
                          <label htmlFor="sort" className="text-xs text-muted-foreground cursor-pointer">Sort canonically</label>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setScope('all');
                            setScopeBook('genesis');
                            setMatchType('contains');
                            setCaseSensitive(false);
                            setSortCanonically(true);
                          }}
                          className="w-full h-8 text-xs"
                        >
                          Reset Filters
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>

            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {searchResults.length > 0 && (
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 px-1">
                  Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </div>
              )}

              <ScrollArea className="flex-1 -mx-2 px-2 pr-4">
                <div className="space-y-3 pb-8">
                  {searchResults.map((result, index) => (
                    <div
                      key={`${result.book}-${result.chapter}-${result.verse}-${index}`}
                      onClick={() => handleResultClick(result)}
                      className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {result.bookName} {result.chapter}:{result.verse}
                          </span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Read Now →</span>
                        </div>
                      </div>
                      <p
                        className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: highlight(result.text, searchQuery) }}
                      />
                    </div>
                  ))}
                  {isSearching && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-slate-500 animate-pulse">Searching the scriptures...</p>
                    </div>
                  )}
                  {!isSearching && searchQuery && searchResults.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-slate-500">No verses found matching "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
