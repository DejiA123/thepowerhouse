import { describe, expect, test } from 'bun:test';
import { nextChapterAfter, previousChapterBefore } from './nextChapter';

describe('next chapter', () => {
  test('moves to the next chapter in the same book', () => {
    expect(nextChapterAfter('genesis', 1)).toEqual({ book: 'genesis', chapter: 2, newBook: false });
  });
  test('after the last chapter, moves to chapter 1 of the next book', () => {
    expect(nextChapterAfter('genesis', 50)).toEqual({ book: 'exodus', chapter: 1, newBook: true });
  });
  test('works however the book name is written', () => {
    expect(nextChapterAfter('1 Samuel', 31)?.book).toBe('2-samuel');
    expect(nextChapterAfter('Malachi', 4)?.book).toBe('matthew');
  });
  test('Loop Book goes back to chapter 1 of the same book', () => {
    expect(nextChapterAfter('ruth', 4, true)).toEqual({ book: 'ruth', chapter: 1, newBook: false });
  });
  test('stops at the end of the Bible', () => {
    expect(nextChapterAfter('revelation', 22)).toBeNull();
  });
  test('previous from chapter 1 goes to the last chapter of the previous book', () => {
    expect(previousChapterBefore('exodus', 1)).toEqual({ book: 'genesis', chapter: 50, newBook: true });
  });
});
