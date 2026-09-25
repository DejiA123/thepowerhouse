import { enhancedApiBibleService } from '@/services/enhancedApiBibleService';

/**
 * Clean common artifacts from Bible API text: inline references (6:1 or 6.1),
 * footnote letters ([a], (a)), pilcrows and stray verse numbers.
 */
export const cleanVerseArtifacts = (input: string): string => {
  let cleaned = input;

  // First, aggressively remove numbers before brackets
  cleaned = cleaned
    // Remove verse numbers that appear before bracketed numbers (multiple patterns)
    .replace(/\b\d+\s+(\[\d+\])/g, '$1') // "1 [1]" -> "[1]"
    .replace(/\b\d+\s*(\[\d+\])/g, '$1') // "1[1]" -> "[1]" (no space)
    .replace(/\s+\d+\s+(\[\d+\])/g, ' $1') // " 1 [1]" -> " [1]"
    .replace(/\s+\d+\s*(\[\d+\])/g, ' $1') // " 1[1]" -> " [1]" (no space)
    // Remove any standalone numbers that appear before brackets
    .replace(/(\s|^)\d+(\s*\[\d+\])/g, '$1$2')
    // More aggressive: remove any number followed by brackets
    .replace(/\d+\s*(\[\d+\])/g, '$1')
    // Even more aggressive: remove any number that appears before text that contains brackets
    .replace(/^\s*\d+\s+(?=.*\[\d+\])/g, '') // Remove verse numbers at start if text contains brackets
    .replace(/\s+\d+\s+(?=.*\[\d+\])/g, ' '); // Remove standalone numbers if text contains brackets

  // Add consistent line breaks before verse numbers for better readability
  // Use a more direct approach to ensure ALL verse numbers get the same spacing
  cleaned = cleaned
    // Remove brackets from verse numbers if present
    .replace(/\[(\d+)\]/g, '$1')
    // First, normalize all existing line breaks and whitespace around verse numbers
    .replace(/\s*\n*\s*(\d+)(?=\s)/g, '\n\n$1') // Replace any whitespace/line breaks before verse numbers with exactly two line breaks
    // Clean up any triple or more line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Ensure the first verse number doesn't have line breaks at the start
    .replace(/^\n+(\d+)/g, '$1');

  // Then apply other cleaning rules
  cleaned = cleaned
    // Remove verse numbers at the beginning of text (e.g., "1 In the beginning...")
    .replace(/^\s*\d+\s+/, '')
    // Remove verse numbers anywhere in the text that might be standalone (e.g., "1" at start of line)
    .replace(/\b\d+\s+(?=[A-Z])/g, '')
    // Remove tokens like 6:1 or 6.1 that sometimes appear in Psalms/OT feeds
    .replace(/\b\d+[:.]\d+\b/g, '')
    // Remove single-letter footnote markers like [a] but keep numbered brackets like [1], [2], [3]
    .replace(/\s*\[[a-zA-Z]\]\s*/g, ' ')
    // Remove parenthetical single-letter footnotes like (a) but keep real words like (Selah)
    .replace(/\s*\(\s*[a-zA-Z]\s*\)\s*/g, ' ')
    // Remove paragraph marks (pilcrow) and other formatting characters
    .replace(/¶/g, '') // Remove paragraph mark
    .replace(/[\u00A0\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g, ' ') // Replace various Unicode spaces with regular space
    // EXTRA AGGRESSIVE: Remove any standalone numbers that appear before text (for bracketed verses)
    .replace(/^\s*\d+\s+(?=.*\[\d+\])/g, '') // Remove numbers at start if brackets exist
    .replace(/\s+\d+\s+(?=.*\[\d+\])/g, ' ') // Remove standalone numbers if brackets exist
    // Normalize leftover spacing
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned;
};

/** One line of plain verse text, with markup and artifacts removed. */
export const plainVerseText = (text: string): string =>
  cleanVerseArtifacts(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** "3:16, 18-20" style list of verse numbers, collapsing runs into ranges. */
export const verseRanges = (verses: number[]): string => {
  const nums = [...new Set(verses)].sort((a, b) => a - b);
  const ranges: string[] = [];
  for (let i = 0; i < nums.length;) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    ranges.push(i === j ? `${nums[i]}` : `${nums[i]}-${nums[j]}`);
    i = j + 1;
  }
  return ranges.join(', ');
};

const chapterCache = new Map<string, Promise<Map<number, string>>>();

/**
 * Plain text of every verse in a chapter, keyed by verse number. Uses the copy
 * saved on this device first, and is cached for the session.
 */
export function getChapterVerses(version: string, book: string, chapter: number): Promise<Map<number, string>> {
  const key = `${version}|${book}|${chapter}`;
  let pending = chapterCache.get(key);
  if (!pending) {
    pending = enhancedApiBibleService
      .getChapterPreferCached(version, book, chapter)
      .then((data) => {
        const map = new Map<number, string>();
        (data?.verses || []).forEach((v, i) => {
          const n = v.verse && !isNaN(Number(v.verse)) ? Number(v.verse) : i + 1;
          if (!map.has(n)) map.set(n, plainVerseText(v.text || ''));
        });
        if (!map.size) chapterCache.delete(key);
        return map;
      })
      .catch(() => {
        chapterCache.delete(key);
        return new Map<number, string>();
      });
    chapterCache.set(key, pending);
  }
  return pending;
}

/** Escape text for inclusion in note HTML. */
export const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
