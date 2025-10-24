import { useState, useEffect, useRef } from "react";
import { BibleChapter, BibleVerse } from "@/types/bible";
import { BibleNavigation } from "@/components/bible/BibleNavigation";
import { Button } from "@/components/ui/button";

const BibleVerseContent = ({ verse, isHighlighted, onVerseClick, fontSize, redLetters }: {
  verse: BibleVerse;
  isHighlighted: boolean;
  onVerseClick: () => void;
  fontSize: number;
  redLetters: boolean;
}) => {
  const isRedLetterText = redLetters && /“/.test(verse.text);

  return (
    <p 
      className={`mb-2 transition-colors duration-300 ${isHighlighted ? 'bg-primary/10 rounded-md p-2' : 'p-2'}`}
      style={{ fontSize: `${fontSize}px` }}
      onClick={onVerseClick}
    >
      <sup className="text-xs text-muted-foreground mr-1">{verse.verse}</sup>
      <span className={isRedLetterText ? 'text-red-500' : ''}>{verse.text}</span>
    </p>
  );
};

interface BibleChapterContentProps {
  selectedBook: string;
  selectedChapter: number;
  chapterContent: BibleChapter | null;
  loading: boolean;
  onBackToChapters: () => void;
  onBackToBooks: () => void;
  onChapterChange: (chapter: number, isAutoPlay?: boolean) => void;
  onBookChange: (book: string, chapter: number, isAutoPlay?: boolean) => void;
  autoPlayNext: boolean;
  onAutoPlayChange: (value: boolean) => void;
  currentVerse: number;
  shouldAutoPlay: boolean;
  onAutoPlayTriggered: () => void;
  onVerseHighlight: (verseNumber: number) => void;
  onVersionSelectorOpen: () => void;
  onSearchOpen: () => void;
  onMenuOpen: () => void;
  selectedVersion: string;
  versions: any[];
  fontSize: number;
  pitch: number;
  rate: number;
  redLetters: boolean;
  menuSettingsVersion: number;
}

export const BibleChapterContent = ({ ...props }: BibleChapterContentProps) => {
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [props.selectedBook, props.selectedChapter]);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="bible-header-full z-10 bg-background shadow-md">
        <div style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <BibleNavigation {...props} />
        </div>
      </div>

      <div ref={mainContentRef} className="bible-main-content-full flex-1 overflow-y-auto pb-16">
        {props.loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading chapter...</p>
            </div>
          </div>
        ) : props.chapterContent ? (
          <div className="p-4">
            {props.chapterContent.verses.map((verse: BibleVerse) => (
              <BibleVerseContent
                key={verse.verse}
                verse={verse}
                isHighlighted={props.currentVerse === parseInt(verse.verse)}
                onVerseClick={() => props.onVerseHighlight(parseInt(verse.verse))}
                fontSize={props.fontSize}
                redLetters={props.redLetters}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No content available.</p>
          </div>
        )}
      </div>
    </div>
  );
};
