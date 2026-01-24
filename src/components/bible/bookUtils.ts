import { bibleBooks } from "./BibleBookList";

export interface FlatBook {
  name: string;
  apiName: string;
  chapters: number;
}

const normalizeKey = (value: string): string => {
  return (value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
};

export const getAllBooksFlat = (): FlatBook[] => {
  return [
    ...bibleBooks["Old Testament"],
    ...bibleBooks["New Testament"],
  ];
};

// Build a lookup map from various normalized keys to the canonical apiName
const buildLookup = () => {
  const map = new Map<string, string>();

  // Add common API abbreviations mapping
  const apiAbbreviations: Record<string, string> = {
    '1sa': '1-samuel', '2sa': '2-samuel', '1ki': '1-kings', '2ki': '2-kings',
    '1ch': '1-chronicles', '2ch': '2-chronicles', '1co': '1-corinthians', '2co': '2-corinthians',
    '1th': '1-thessalonians', '2th': '2-thessalonians', '1ti': '1-timothy', '2ti': '2-timothy',
    '1pe': '1-peter', '2pe': '2-peter', '1jn': '1-john', '2jn': '2-john', '3jn': '3-john',
    'song': 'song-of-solomon', 'sos': 'song-of-solomon', 'eccl': 'ecclesiastes'
  };

  // Add API abbreviations to the map
  for (const [abbrev, apiName] of Object.entries(apiAbbreviations)) {
    map.set(abbrev, apiName);
  }

  for (const b of getAllBooksFlat()) {
    const api = b.apiName;
    const n1 = normalizeKey(api);
    const n2 = normalizeKey(b.name);
    map.set(n1, api);
    map.set(n2, api);
  }
  return map;
};

const BOOK_LOOKUP = buildLookup();

export const normalizeBookApiName = (input: string): string => {
  if (!input) return input;
  const key = normalizeKey(input);
  return BOOK_LOOKUP.get(key) || input.toLowerCase();
};

export const formatBookDisplayName = (input: string): string => {
  if (!input) return input;

  // Try to find the official name from the flat list first
  const flattened = getAllBooksFlat();
  const found = flattened.find(b =>
    normalizeKey(b.apiName) === normalizeKey(input) ||
    normalizeKey(b.name) === normalizeKey(input)
  );

  if (found) return found.name;

  // Fallback: title case the input
  return input.replace(/[-_]/g, " ")
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};
