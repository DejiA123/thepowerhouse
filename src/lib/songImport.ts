/**
 * "Import from Notes" (choir setlists): turning a pasted list into song titles,
 * and finding each in the song library.
 */

/**
 * One title per line, however it was pasted: iPhone Notes uses its own line
 * breaks (U+2028) or \r; lists often have bullets, numbers or checkboxes
 * ("• Way Maker", "1. Way Maker", "- [ ] Way Maker"); blank lines are skipped.
 */
export function notesLines(text: string): string[] {
  return text
    .split(/\r\n|\r|\n|\u2028|\u2029/)
    .map((line) =>
      line
        .replace(/^\s*(?:[-*•·–—▪◦●○]+\s*)?(?:\[[ xX✓]?\]\s*)?(?:\(?\d{1,3}[.):\]-]?\)?\s+)?/, '')
        .replace(/^["“”'‘’]+|["“”'‘’]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((line) => line.length > 0);
}

/** Letters and digits only, lower case: "Way-Maker!" and "way maker" are the same */
const norm = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Find a pasted title in the library: the same title (ignoring case, punctuation
 * and accents), else the title before " - " / " (" (a key or singer written after
 * it, "Way Maker - G"), else the one library song whose title contains it or is
 * contained in it. Nothing if it's unclear.
 */
export function libraryMatcher<T extends { title: string }>(library: T[]) {
  const byTitle = new Map<string, T>();
  library.forEach((song) => {
    const key = norm(song.title);
    if (key && !byTitle.has(key)) byTitle.set(key, song);
  });
  return (line: string): T | undefined => {
    const whole = norm(line);
    if (!whole) return undefined;
    const exact = byTitle.get(whole);
    if (exact) return exact;
    const head = norm(line.split(/\s[-–—|]\s|\s\(/)[0]);
    if (head && head !== whole && byTitle.get(head)) return byTitle.get(head);
    const words = head || whole;
    if (words.length < 4) return undefined;
    const close = library.filter((song) => {
      const t = norm(song.title);
      return t.length >= 4 && (t.includes(words) || words.includes(t));
    });
    return close.length === 1 ? close[0] : undefined;
  };
}
