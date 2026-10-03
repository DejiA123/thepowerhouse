import { getAllBooksFlat } from '@/components/bible/bookUtils';
import { MCHEYNE } from '@/data/plans/mcheyne';
import { MORNING_EVENING } from '@/data/plans/morningEvening';

export interface DailyReading {
  day: number;
  /** Passages, e.g. "Genesis 1-3", "Psalm 23", "John 1:1-5" */
  readings: string[];
  description?: string;
  teachingTitle?: string;
  teachingText?: string;
  reflectionQuestion?: string;
  /** The calendar date this day belongs to, for plans that follow the year ("January 1") */
  date?: string;
  /** Spurgeon's Morning and Evening: which day's readings to show (month 1-12, day of month) */
  classic?: { month: number; day: number };
}

export type PlanTag = 'start' | 'short' | 'jesus' | 'wisdom' | 'whole' | 'deep';

export interface ReadingPlan {
  id: string;
  name: string;
  /** One line for cards */
  description: string;
  /** A paragraph for the plan page */
  intro: string;
  duration: string;
  totalDays: number;
  minutesPerDay: number;
  totalChapters: number;
  /** What totalChapters counts, when the plan reads passages rather than whole chapters */
  countNoun?: string;
  tags: PlanTag[];
  /** Cover art: Tailwind gradient classes and an icon key (see the plans page) */
  cover: { gradient: string; icon: string };
  reward: string;
  /** Where the plan comes from */
  source?: string;
  /** No longer offered; still shown to people who have started it */
  retired?: boolean;
  dailyReadings: DailyReading[];
}

// ── Building plans from the real shape of the Bible ────────────────────

interface Chapter {
  name: string;
  chapter: number;
}

const BOOKS = getAllBooksFlat();
const OT = BOOKS.slice(0, 39).map((b) => b.name);
const NT = BOOKS.slice(39).map((b) => b.name);

const chaptersOf = (names: string[]): Chapter[] =>
  names.flatMap((name) => {
    const book = BOOKS.find((b) => b.name === name);
    if (!book) throw new Error(`Unknown book ${name}`);
    return Array.from({ length: book.chapters }, (_, i) => ({ name, chapter: i + 1 }));
  });

/** Split a list into `days` runs of (almost) equal length, in order. */
function split<T>(list: T[], days: number): T[][] {
  return Array.from({ length: days }, (_, d) =>
    list.slice(Math.round((d * list.length) / days), Math.round(((d + 1) * list.length) / days)),
  );
}

/** Merge two reading tracks so both advance at the same pace. */
function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (j >= b.length || (i < a.length && i / a.length <= j / b.length)) out.push(a[i++]);
    else out.push(b[j++]);
  }
  return out;
}

const bookLabel = (name: string, single: boolean) => (name === 'Psalms' && single ? 'Psalm' : name);

/** [Gen 1, Gen 2, Gen 3, Exo 1] → ["Genesis 1-3", "Exodus 1"] */
function compress(chapters: Chapter[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < chapters.length) {
    let j = i;
    while (j + 1 < chapters.length && chapters[j + 1].name === chapters[i].name && chapters[j + 1].chapter === chapters[j].chapter + 1) j++;
    const { name, chapter } = chapters[i];
    out.push(i === j ? `${bookLabel(name, true)} ${chapter}` : `${bookLabel(name, false)} ${chapter}-${chapters[j].chapter}`);
    i = j + 1;
  }
  return out;
}

/** Readings from one or more tracks that each get split across the plan. */
function fromTracks(days: number, tracks: Chapter[][], describe?: (day: number) => string): DailyReading[] {
  const parts = tracks.map((t) => split(t, days));
  return Array.from({ length: days }, (_, d) => ({
    day: d + 1,
    readings: parts.flatMap((p) => compress(p[d])),
    description: describe?.(d + 1),
  }));
}

/** About four minutes a chapter, plus time for a devotional */
const minutes = (chapters: number, days: number, devotional = false) =>
  Math.max(5, Math.round(((chapters / days) * 4 + (devotional ? 3 : 0)) / 5) * 5);

// ── The plans ──────────────────────────────────────────────────────────

const GOSPELS = ['Matthew', 'Mark', 'Luke', 'John'];
const PAUL = ['Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon'];
const PROPHETS = ['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel'];

/**
 * The Psalter as divided in the Book of Common Prayer (1662): every Psalm in a
 * month, morning and evening. In months with 31 days, day 30 is read again.
 */
const BCP_PSALTER: [morning: string, evening: string][] = [
  ['1-5', '6-8'], ['9-11', '12-14'], ['15-17', '18'], ['19-21', '22-23'], ['24-26', '27-29'], ['30-31', '32-34'],
  ['35-36', '37'], ['38-40', '41-43'], ['44-46', '47-49'], ['50-52', '53-55'], ['56-58', '59-61'], ['62-64', '65-67'],
  ['68', '69-70'], ['71-72', '73-74'], ['75-77', '78'], ['79-81', '82-85'], ['86-88', '89'], ['90-92', '93-94'],
  ['95-97', '98-101'], ['102-103', '104'], ['105', '106'], ['107', '108-109'], ['110-113', '114-115'], ['116-118', '119:1-32'],
  ['119:33-72', '119:73-104'], ['119:105-144', '119:145-176'], ['120-125', '126-131'], ['132-135', '136-138'], ['139-141', '142-143'],
  ['144-146', '147-150'],
];
const psalmRef = (r: string) => (/^\d+(:|$)/.test(r) && !r.includes('-') ? `Psalm ${r}` : r.includes(':') ? `Psalm ${r}` : `Psalms ${r}`);

/** How many chapters (or part chapters) a day's readings come to. */
const passageCount = (days: DailyReading[]) => days.reduce((n, d) => n + d.readings.reduce((m, r) => m + expandReading(r).length, 0), 0);

function buildPlans(): ReadingPlan[] {
  const psalms = chaptersOf(['Psalms']);
  const proverbs = chaptersOf(['Proverbs']);
  const otNarrative = chaptersOf(OT.filter((b) => b !== 'Psalms' && b !== 'Proverbs'));
  const ntAndWisdom = interleave(chaptersOf(NT), interleave(psalms, proverbs));

  const plan = (p: Omit<ReadingPlan, 'totalChapters' | 'duration'> & { chapters: number }): ReadingPlan => {
    const { chapters, ...rest } = p;
    return { ...rest, totalChapters: chapters, duration: `${p.totalDays} days` };
  };

  const mcheyne: DailyReading[] = MCHEYNE.map(([date, readings], i) => ({ day: i + 1, date, description: date, readings }));
  const morningEvening: DailyReading[] = MORNING_EVENING.map(([date, morning, evening], i) => {
    const [monthName, dayOfMonth] = date.split(' ');
    const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(monthName) + 1;
    return { day: i + 1, date, description: date, readings: [morning, evening], classic: { month, day: Number(dayOfMonth) } };
  });
  const psalter: DailyReading[] = Array.from({ length: 31 }, (_, i) => {
    const [morning, evening] = BCP_PSALTER[Math.min(i, 29)];
    return { day: i + 1, readings: [psalmRef(morning), psalmRef(evening), `Proverbs ${i + 1}`] };
  });

  return [
    plan({
      id: 'mcheyne',
      name: "M'Cheyne Bible Reading Plan",
      description: 'The classic plan: the whole Bible in a year, the New Testament and Psalms twice',
      intro:
        "Robert Murray M'Cheyne, minister of St Peter's, Dundee, drew up this calendar in 1842 for his congregation, and Christians around the world have used it ever since. Four chapters a day from different parts of the Bible take you through the Old Testament once and the New Testament and Psalms twice in a year. Day 1 is 1 January, but you can begin on any day.",
      totalDays: 365,
      minutesPerDay: 20,
      chapters: passageCount(mcheyne),
      countNoun: 'readings',
      tags: ['whole', 'deep'],
      cover: { gradient: 'from-indigo-700 via-blue-700 to-sky-600', icon: 'globe' },
      reward: "You read the whole Bible with M'Cheyne, and the New Testament and Psalms twice.",
      source: "Robert Murray M'Cheyne, Calendar for Daily Readings (1842). Classic edition transcribed by Ben Edgington (edginet.org/mcheyne), CC0.",
      dailyReadings: mcheyne,
    }),
    plan({
      id: 'morning-evening',
      name: 'Morning and Evening',
      description: "Spurgeon's much-loved daily readings for every morning and evening of the year",
      intro:
        "C. H. Spurgeon, the 'Prince of Preachers', wrote these short readings in the 1860s to open and close each day with a verse of Scripture and a word about Christ. Each day has a morning and an evening reading. Day 1 is 1 January, but you can begin on any day.",
      totalDays: 366,
      minutesPerDay: 10,
      chapters: 732,
      countNoun: 'readings',
      tags: ['jesus', 'deep'],
      cover: { gradient: 'from-amber-500 via-orange-500 to-indigo-700', icon: 'sunrise' },
      reward: "You spent a whole year of mornings and evenings with Spurgeon's Morning and Evening.",
      source: 'C. H. Spurgeon, Morning and Evening: Daily Readings (1865-1868). Public domain; text from the Christian Classics Ethereal Library.',
      dailyReadings: morningEvening,
    }),
    plan({
      id: 'bible-year',
      name: 'Bible in a Year',
      description: 'The whole Bible, cover to cover, in 365 days',
      intro:
        'Read through the entire Bible in one year. Each day pairs a portion of the Old Testament with a reading from the New Testament, Psalms or Proverbs, so you are always moving through the story of Scripture and the life of the church together.',
      totalDays: 365,
      minutesPerDay: minutes(1189, 365),
      chapters: 1189,
      tags: ['whole', 'deep'],
      cover: { gradient: 'from-indigo-600 via-blue-600 to-sky-500', icon: 'globe' },
      reward: 'You read the whole Bible. Every book, every chapter.',
      // Replaced by M'Cheyne's plan; kept for anyone already reading it
      retired: true,
      dailyReadings: fromTracks(365, [otNarrative, ntAndWisdom]),
    }),
    plan({
      id: 'new-testament',
      name: 'New Testament in 90 Days',
      description: 'From the birth of Jesus to Revelation in three months',
      intro:
        'Journey through the whole New Testament in 90 days: the four Gospels, the birth of the church in Acts, the letters to the early churches and the hope of Revelation. About three chapters a day.',
      totalDays: 90,
      minutesPerDay: minutes(260, 90),
      chapters: 260,
      tags: ['deep'],
      cover: { gradient: 'from-sky-500 via-cyan-500 to-teal-400', icon: 'cross' },
      reward: 'You read the entire New Testament.',
      dailyReadings: fromTracks(90, [chaptersOf(NT)]),
    }),
    plan({
      id: 'gospels',
      name: 'The Four Gospels',
      description: 'The life of Jesus through Matthew, Mark, Luke and John',
      intro:
        'Walk with Jesus through all four Gospels in a month. Matthew shows Him as the promised King, Mark as the servant who came to give His life, Luke as the Saviour of all people, and John as the eternal Son of God.',
      totalDays: 30,
      minutesPerDay: minutes(89, 30),
      chapters: 89,
      tags: ['jesus', 'short'],
      cover: { gradient: 'from-rose-500 via-red-500 to-orange-400', icon: 'heart' },
      reward: 'You followed Jesus through all four Gospels.',
      dailyReadings: fromTracks(30, [chaptersOf(GOSPELS)]),
    }),
    plan({
      id: 'john-21',
      name: 'John in 21 Days',
      description: 'One chapter a day with the beloved disciple',
      intro:
        "John wrote his Gospel 'so that you may believe that Jesus is the Messiah, the Son of God, and that by believing you may have life in his name.' One chapter a day for three weeks — a perfect place to start, or to start again.",
      totalDays: 21,
      minutesPerDay: minutes(21, 21),
      chapters: 21,
      tags: ['start', 'jesus', 'short'],
      cover: { gradient: 'from-amber-400 via-orange-400 to-rose-400', icon: 'sun' },
      reward: 'You read the Gospel of John.',
      dailyReadings: fromTracks(21, [chaptersOf(['John'])]),
    }),
    plan({
      id: 'psalms-proverbs',
      name: 'Psalms & Proverbs',
      description: 'Every Psalm and every Proverb in a month',
      intro:
        "Pray through all 150 Psalms in a month, morning and evening, as the Church has done for centuries with the Book of Common Prayer, and read the chapter of Proverbs for each day of the month.",
      totalDays: 31,
      minutesPerDay: minutes(181, 31),
      chapters: 181,
      tags: ['wisdom', 'short'],
      cover: { gradient: 'from-violet-500 via-purple-500 to-fuchsia-500', icon: 'music' },
      reward: 'You prayed every Psalm and read every Proverb.',
      source: 'Psalms as divided in the Book of Common Prayer (1662); Proverbs one chapter a day.',
      dailyReadings: psalter,
    }),
    plan({
      id: 'proverbs-month',
      name: 'Proverbs in a Month',
      description: 'A chapter of wisdom for every day of the month',
      intro:
        'Proverbs has 31 chapters — one for each day of the month. Short, practical and memorable, it speaks to work, words, money, friendship and family. Read today’s chapter and pick one proverb to carry with you.',
      totalDays: 31,
      minutesPerDay: minutes(31, 31),
      chapters: 31,
      tags: ['wisdom', 'short', 'start'],
      cover: { gradient: 'from-yellow-400 via-amber-400 to-orange-500', icon: 'lightbulb' },
      reward: 'You read all of Proverbs.',
      dailyReadings: fromTracks(31, [proverbs]),
    }),
    plan({
      id: 'acts-28',
      name: 'Acts: The Church Is Born',
      description: 'The Spirit comes and the gospel goes to the world',
      intro:
        'From the ascension of Jesus to Paul in Rome, Acts tells how the Holy Spirit filled ordinary people and sent them out. One chapter a day for four weeks.',
      totalDays: 28,
      minutesPerDay: minutes(28, 28),
      chapters: 28,
      tags: ['short'],
      cover: { gradient: 'from-teal-500 via-sky-500 to-blue-500', icon: 'wind' },
      reward: 'You read the story of the early church.',
      dailyReadings: fromTracks(28, [chaptersOf(['Acts'])]),
    }),
    plan({
      id: 'epistles',
      name: "Paul's Letters",
      description: 'Romans to Philemon in 60 days',
      intro:
        "Study the theological foundations of Christianity through the Apostle Paul's thirteen letters. From Romans to Philemon, discover the deep truths about salvation, Christian living and the church.",
      totalDays: 60,
      minutesPerDay: minutes(87, 60),
      chapters: 87,
      tags: ['deep'],
      cover: { gradient: 'from-cyan-600 via-blue-600 to-indigo-600', icon: 'scroll' },
      reward: "You read all of Paul's letters.",
      dailyReadings: fromTracks(60, [chaptersOf(PAUL)]),
    }),
    plan({
      id: 'prophets',
      name: 'Major Prophets',
      description: 'Isaiah, Jeremiah, Lamentations, Ezekiel and Daniel',
      intro:
        "Explore the powerful messages of God's major prophets. These books hold some of Scripture's deepest calls to repentance and its brightest promises of the coming Messiah.",
      totalDays: 120,
      minutesPerDay: minutes(183, 120),
      chapters: 183,
      tags: ['deep'],
      cover: { gradient: 'from-slate-700 via-indigo-700 to-violet-600', icon: 'flame' },
      reward: 'You read the Major Prophets.',
      dailyReadings: fromTracks(120, [chaptersOf(PROPHETS)]),
    }),
  ];
}

// ── Passages ───────────────────────────────────────────────────────────

export interface Passage {
  /** App book id, e.g. "1-corinthians" */
  book: string;
  bookName: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  /** "Genesis 3" or "John 1:1-5" */
  label: string;
}

/**
 * "Genesis 1-3" → three chapter passages; "John 1:1-5" → one passage with verses;
 * "Exodus 11:1-12:21" → Exodus 11 from verse 1, then Exodus 12 to verse 21;
 * "1 John 3:1,2" → verses 1 to 2.
 */
export function expandReading(ref: string): Passage[] {
  const across = ref.trim().match(/^(.+?)\s+(\d+):(\d+)-(\d+):(\d+)$/);
  if (across) {
    const book = BOOKS.find((b) => b.name.toLowerCase() === (across[1] === 'Psalm' ? 'Psalms' : across[1]).toLowerCase());
    if (!book) return [];
    const [c1, v1, c2, v2] = across.slice(2).map(Number);
    return Array.from({ length: c2 - c1 + 1 }, (_, i) => {
      const chapter = c1 + i;
      const verseStart = chapter === c1 && v1 > 1 ? v1 : undefined;
      const verseEnd = chapter === c2 ? v2 : undefined;
      const label = verseStart ? `${book.name} ${chapter}:${verseStart}-end` : verseEnd ? `${book.name} ${chapter}:1-${verseEnd}` : `${book.name} ${chapter}`;
      return { book: book.apiName, bookName: book.name, chapter, verseStart, verseEnd, label };
    });
  }
  const tidy = ref.trim().replace(/:(\d+)\s*,\s*(?:\d+\s*,\s*)*(\d+)$/, ':$1-$2');
  const m = tidy.match(/^(.+?)\s+(\d+)(?:-(\d+))?(?::(\d+)(?:-(\d+))?)?$/);
  if (!m) return [];
  const rawName = m[1] === 'Psalm' ? 'Psalms' : m[1];
  const book = BOOKS.find((b) => b.name.toLowerCase() === rawName.toLowerCase());
  if (!book) return [];
  const start = Number(m[2]);
  if (m[4]) {
    const verseStart = Number(m[4]);
    const verseEnd = m[5] ? Number(m[5]) : verseStart;
    return [{ book: book.apiName, bookName: book.name, chapter: start, verseStart, verseEnd, label: ref }];
  }
  const end = m[3] ? Number(m[3]) : start;
  return Array.from({ length: end - start + 1 }, (_, i) => ({
    book: book.apiName,
    bookName: book.name,
    chapter: start + i,
    label: `${bookLabel(book.name, true)} ${start + i}`,
  }));
}

class ReadingPlanService {
  private plans: ReadingPlan[] = buildPlans();

  getAllPlans(): ReadingPlan[] {
    return this.plans;
  }

  getPlanById(planId: string): ReadingPlan | null {
    return this.plans.find((plan) => plan.id === planId) || null;
  }

  getTodaysReading(planId: string, currentDay: number): DailyReading | null {
    const plan = this.getPlanById(planId);
    if (!plan) return null;
    return plan.dailyReadings.find((reading) => reading.day === currentDay) || null;
  }
}

export const readingPlanService = new ReadingPlanService();
