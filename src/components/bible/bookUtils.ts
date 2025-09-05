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


