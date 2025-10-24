import { ChevronLeft, Menu, Search, Bookmark, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bibleBooks } from './BibleBookList';

interface BibleNavigationProps {
    selectedBook: string;
    selectedChapter: number;
    onBackToBooks: () => void;
    onBackToChapters: () => void;
    onChapterChange: (chapter: number) => void;
    onBookChange: (book: string, chapter: number) => void;
    onVersionSelectorOpen: () => void;
    onSearchOpen: () => void;
    onMenuOpen: () => void;
}

export const BibleNavigation = (props: BibleNavigationProps) => {
    const allBooks = [...bibleBooks["Old Testament"], ...bibleBooks["New Testament"]];
    const currentBook = allBooks.find(b => b.apiName === props.selectedBook);

    const handlePreviousChapter = () => {
        if (props.selectedChapter > 1) {
            props.onChapterChange(props.selectedChapter - 1);
        } else {
            const currentBookIndex = allBooks.findIndex(b => b.apiName === props.selectedBook);
            if (currentBookIndex > 0) {
                const prevBook = allBooks[currentBookIndex - 1];
                props.onBookChange(prevBook.apiName, prevBook.chapters);
            }
        }
    };

    const handleNextChapter = () => {
        if (currentBook && props.selectedChapter < currentBook.chapters) {
            props.onChapterChange(props.selectedChapter + 1);
        } else {
            const currentBookIndex = allBooks.findIndex(b => b.apiName === props.selectedBook);
            if (currentBookIndex < allBooks.length - 1) {
                const nextBook = allBooks[currentBookIndex + 1];
                props.onBookChange(nextBook.apiName, 1);
            }
        }
    };

    return (
        <div className="bg-background border-b p-2 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" onClick={props.onBackToBooks}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <Select
                    value={props.selectedBook}
                    onValueChange={(book) => props.onBookChange(book, 1)}
                >
                    <SelectTrigger className="w-[150px] truncate">
                        <SelectValue placeholder="Select a book" />
                    </SelectTrigger>
                    <SelectContent>
                        {allBooks.map(book => (
                            <SelectItem key={book.apiName} value={book.apiName}>
                                {book.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={String(props.selectedChapter)}
                    onValueChange={(chapter) => props.onChapterChange(parseInt(chapter))}
                >
                    <SelectTrigger className="w-[80px]">
                        <SelectValue placeholder="Ch" />
                    </SelectTrigger>
                    <SelectContent>
                        {currentBook && Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map(c => (
                            <SelectItem key={c} value={String(c)}>
                                {c}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center space-x-1">
                <Button variant="ghost" size="icon" onClick={props.onSearchOpen}>
                    <Search className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={props.onVersionSelectorOpen}>
                    <Bookmark className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={props.onMenuOpen}>
                    <Menu className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
};
