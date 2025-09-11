import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, BookOpen, Settings2 } from "lucide-react";
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
  const { toast } = useToast();
  const runIdRef = useRef(0);

  const allBooks = [...bibleBooks["Old Testament"], ...bibleBooks["New Testament"]];
  const otSet = new Set(bibleBooks["Old Testament"].map(b => b.apiName));
  const ntBooks = bibleBooks["New Testament"];
  const otBooks = bibleBooks["Old Testament"];

  // Determine scanning order for fallback: NT first for Whole Bible to surface common terms quickly
  const scanBooks = (() => {
    switch (scope) {
      case 'ot':
        return otBooks;
      case 'nt':
        return ntBooks;
      case 'book': {
        const found = allBooks.find(b => b.apiName === scopeBook);
        return found ? [found] : [];
      }
      case 'all':
      default:
        return [...ntBooks, ...otBooks];
    }
  })();

  useEffect(() => {
    // Clear results when modal closes
    if (!isOpen) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchQuery("");
    }
  }, [isOpen]);

  const buildMatcher = (query: string) => {
    const q = caseSensitive ? query : query.toLowerCase();
    const tokens = q.split(/\s+/).filter(t => t.length > 0);
    return (textIn: string) => {
      const text = caseSensitive ? textIn : textIn.toLowerCase();
      switch (matchType) {
        case 'phrase':
          return text.includes(q);
        case 'all':
          return tokens.every(t => text.includes(t));
        case 'any':
          return tokens.some(t => t.length > 2 && text.includes(t));
        case 'whole': {
          // whole word boundary search for the full query
          const pattern = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, caseSensitive ? 'g' : 'gi');
          return pattern.test(textIn);
        }
        default:
          return text.includes(q);
      }
    };
  };

  const highlight = (text: string, query: string) => {
    if (!query.trim()) return text;
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');
    let pattern: RegExp;
    if (matchType === 'phrase' || matchType === 'contains') {
      pattern = new RegExp(esc(query), caseSensitive ? 'g' : 'gi');
    } else if (matchType === 'whole') {
      pattern = new RegExp(`\\b${esc(query)}\\b`, caseSensitive ? 'g' : 'gi');
    } else {
      const parts = query.split(/\s+/).filter(Boolean).map(esc);
      pattern = new RegExp(parts.join('|'), caseSensitive ? 'g' : 'gi');
    }
    // Use theme-aware highlight colors: darker text on light highlight in both themes
    return text.replace(
      pattern,
      (m) => `<mark class="bg-yellow-200 text-gray-900 dark:bg-amber-300 dark:text-black rounded px-0.5">${m}</mark>`
    );
  };

  const inScope = (apiName: string) => {
    if (scope === 'all') return true;
    if (scope === 'ot') return otSet.has(apiName);
    if (scope === 'nt') return !otSet.has(apiName);
    if (scope === 'book') return apiName === scopeBook;
    return true;
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = searchQuery.trim();
    if (!raw) { setSearchResults([]); setIsSearching(false); return; }

    const version = selectedVersion || 'kjv';
    const currentRun = ++runIdRef.current;
    setIsSearching(true);
    setSearchResults([]);

    // Debug: Log current search settings
    console.log('🔍 Search settings:', {
      query: raw,
      version: version,
      sortCanonically: sortCanonically,
      scope: scope,
      matchType: matchType,
      caseSensitive: caseSensitive
    });

    const matcher = buildMatcher(raw);

    try {
      // 1) Try API-backed search first (fastest when supported)
      let apiResults: SearchResult[] = [];
      try {
        const verses = await enhancedApiBibleService.search(version, raw);
        apiResults = (verses || []).map(v => {
          // Map result.book (pretty name) to apiName
          const found = allBooks.find(b => b.name.toLowerCase() === (v.book || '').toLowerCase())
            || allBooks.find(b => b.apiName.toLowerCase() === (v.book || '').toLowerCase())
            || allBooks.find(b => b.name.toLowerCase().includes((v.book || '').toLowerCase()))
            || allBooks.find(b => (v.book || '').toLowerCase().includes(b.name.toLowerCase()));
          
          const apiName = found ? found.apiName : normalizeBookApiName(v.book || '');
          const bookName = found ? found.name : (v.book || '');
          
          // Debug: Log the mapping to see what's happening
          console.log('🔍 Book mapping:', {
            originalBook: v.book,
            foundBook: found?.name,
            apiName: apiName,
            bookName: bookName,
            chapter: v.chapter,
            verse: v.verse
          });
          
          return {
            book: apiName,
            chapter: v.chapter || 1,
            verse: parseInt(String(v.verse || 1)) || 1,
            text: v.text || '',
            bookName: bookName || apiName
          } as SearchResult;
        }).filter(r => inScope(r.book) && matcher(r.text));
      } catch {}

      // If API gave enough, use it; else fallback to local scan with a time budget
      let combined: SearchResult[] = apiResults.slice(0, 200);

      if (combined.length < 25) {
        const results: SearchResult[] = [...combined];
        const baseBudget = scope === 'all' ? 10000 : (scope === 'ot' || scope === 'nt' ? 6000 : 4000);
        const deadline = Date.now() + baseBudget; // adaptive time budget for fallback scan
        let cancelled = false;
        let lastFlush = Date.now();
        outer: for (const bookInfo of scanBooks) {
          if (!inScope(bookInfo.apiName)) continue;
          for (let chapter = 1; chapter <= bookInfo.chapters; chapter++) {
            if (runIdRef.current !== currentRun) { cancelled = true; break outer; }
            if (Date.now() > deadline) break outer;
            const chapterData = await enhancedApiBibleService.getChapter(version, bookInfo.apiName, chapter);
            if (chapterData?.verses) {
              for (const v of chapterData.verses) {
                const verseText = String(v.text || '');
                if (matcher(verseText)) {
                  results.push({
                    book: bookInfo.apiName,
                    bookName: bookInfo.name,
                    chapter,
                    verse: parseInt(String(v.verse || '1')) || 1,
                    text: verseText
                  });
                  if (results.length >= 200) break outer;
                }
              }
              // Periodically flush partial results for responsiveness (every ~250ms)
              if (Date.now() - lastFlush > 250 && runIdRef.current === currentRun) {
                setSearchResults([...results]);
                lastFlush = Date.now();
              }
            }
          }
        }
        combined = results;
        if (!cancelled && combined.length === 0 && Date.now() > deadline) {
          // Indicate partial timeout (optional toast)
          try { toast({ title: 'Partial Results', description: 'Showing partial results. Refine your search to narrow further.' }); } catch {}
        }
      }

      if (sortCanonically) {
        const order: Record<string, number> = {};
        allBooks.forEach((b, i) => { order[b.apiName] = i; });
        
        // Debug: Log the sorting process
        console.log('🔍 Canonical sorting:', {
          totalResults: combined.length,
          firstFewResults: combined.slice(0, 3).map(r => ({
            book: r.book,
            bookName: r.bookName,
            chapter: r.chapter,
            verse: r.verse,
            order: order[r.book]
          }))
        });
        
        combined.sort((a, b) => {
          const bookOrder = (order[a.book] ?? 999) - (order[b.book] ?? 999);
          if (bookOrder !== 0) return bookOrder;
          
          const chapterOrder = a.chapter - b.chapter;
          if (chapterOrder !== 0) return chapterOrder;
          
          return a.verse - b.verse;
        });
        
        console.log('🔍 After canonical sorting:', {
          firstFewResults: combined.slice(0, 3).map(r => ({
            book: r.book,
            bookName: r.bookName,
            chapter: r.chapter,
            verse: r.verse
          }))
        });
      }

      if (runIdRef.current !== currentRun) return; // allow finally to clear for the latest
      setSearchResults(combined);
      if (combined.length === 0) {
        toast({ title: 'No Results', description: `No verses found containing "${raw}".` });
      }
    } catch (error) {
      if (runIdRef.current !== currentRun) {
        // Another run started; let the latest run manage the spinner
      } else {
        console.error('Search error:', error);
        toast({ title: 'Search Error', description: 'Failed to search Bible. Please try again.', variant: 'destructive' });
      }
    } finally {
      // Only clear the spinner if this is still the latest run
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
      <DialogContent className="max-w-2xl max-h-[80vh] mt-12 sm:mt-16 md:mt-20">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Advanced Bible Search</span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => handleSearch(e)} className="space-y-4">
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

          {/* Advanced options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border rounded-lg">
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
        </form>

        {searchResults.length > 0 && (
          <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
            <span>Showing {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</span>
            {sortCanonically && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                Canonically sorted
              </span>
            )}
          </div>
        )}

        <ScrollArea className="max-h-96 mt-2">
          <div className="space-y-2">
            {searchResults.map((result, index) => (
              <div
                key={`${result.book}-${result.chapter}-${result.verse}-${index}`}
                onClick={() => handleResultClick(result)}
                className="p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="flex items-center space-x-2 mb-1">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">
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
    </Dialog>
  );
};