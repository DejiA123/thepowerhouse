import { getAllBooksFlat } from '@/components/bible/bookUtils';

export interface DailyReading {
  day: number;
  /** Passages, e.g. "Genesis 1-3", "Psalm 23", "John 1:1-5" */
  readings: string[];
  description?: string;
  teachingTitle?: string;
  teachingText?: string;
  reflectionQuestion?: string;
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

// ── Devotional content ─────────────────────────────────────────────────

const WISDOM_TEACHING = [
  {
    title: 'The Heart of Worship',
    text: "The Psalms are the prayer book of the Bible. They give us a language for every emotion—joy, sorrow, fear, and praise. Today, as you read Psalm 1, notice the contrast between the one who delights in the Law and the one who doesn't. Wisdom starts with where we find our delight.",
    question: "What are you 'delighting' in today? Is it God's word or the noise of the world?",
  },
  {
    title: 'The Beginning of Knowledge',
    text: "Proverbs reminds us that 'the fear of the Lord is the beginning of knowledge.' This isn't a terrifying fear, but a deep, reverent awe for who God is. When we respect God as the ultimate source of truth, our decisions begin to align with His wisdom.",
    question: "In what decision this week do you need to seek God's 'reverent awe' more than your own logic?",
  },
  {
    title: "God's Steadfast Love",
    text: "Many Psalms reflect on God's 'hesed'—His loyal, covenant love. Even when we fail, His love remains. Wisdom is found in resting in this security, knowing that we are not defined by our performance but by His faithfulness.",
    question: "How can you rest in God's steadfast love today instead of worrying about your mistakes?",
  },
];

const FOUNDATIONS: DailyReading[] = [
  {
    day: 1,
    readings: ['Genesis 1', 'John 1:1-5'],
    description: 'The Creator and His Word',
    teachingTitle: 'In the Beginning',
    teachingText: "The Christian journey begins with an understanding of our origin. Scripture doesn't start with an argument for God's existence; it starts with His action. 'In the beginning, God created...'\n\nWhen we recognize God as Creator, we recognize His authority and His love. John's Gospel echoes this, revealing that the Word (Jesus) was there from the start. Today, as you read, consider that the same God who spoke the stars into existence is the same God who wants to speak into your life.\n\nHis Word is not just a book of rules, but a source of life and light that no darkness can overcome.",
    reflectionQuestion: 'How does knowing that God is your Creator change the way you view your purpose today?',
  },
  {
    day: 2,
    readings: ['Ephesians 2:1-10', 'John 3:16-17'],
    description: 'Grace: The Free Gift',
    teachingTitle: 'Not by Works',
    teachingText: "Many religions are about what man can do to reach God. Christianity is about what God has done to reach man. Grace is 'unmerited favor'—receiving something beautiful that we could never earn.\n\nPaul explains that we were spiritually dead, but God made us alive. This wasn't something we achieved; it's a gift. Why? So that no one can boast. Our salvation is anchored in His love, not our performance.\n\nYou are God's 'handiwork,' created in Christ Jesus to do good works. We don't do good works to be saved, but because we are saved.",
    reflectionQuestion: "Are you trying to earn God's love, or are you resting in the gift of His grace?",
  },
  {
    day: 3,
    readings: ['Romans 8:1-17', 'Galatians 5:16-25'],
    description: 'Life in the Spirit',
    teachingTitle: 'The Helper Within',
    teachingText: "The Christian life is not a solo effort. Before Jesus ascended, He promised a Helper—the Holy Spirit. Living 'in the Spirit' means our internal motivation and power come from God Himself.\n\nRomans 8 tells us there is no condemnation for those in Christ. We are no longer slaves to our old nature but are adopted as children. The Holy Spirit confirms this in our hearts, allowing us to cry out 'Abba, Father.'\n\nWhen we walk by the Spirit, we begin to see 'fruit' grow: love, joy, peace, and patience. It's a natural result of staying connected to the Vine.",
    reflectionQuestion: 'In what area of your life do you need to stop relying on your own strength and start relying on the Holy Spirit?',
  },
  {
    day: 4,
    readings: ['Philippians 4:4-9', 'Matthew 6:25-34'],
    description: 'The Power of Prayer',
    teachingTitle: 'Anxious for Nothing',
    teachingText: "Prayer is more than just asking God for things; it's an exchange. We give God our worries, and He gives us His peace. Paul encourages us in Philippians to not be anxious about anything, but in everything, by prayer and petition, with thanksgiving, present our requests to God.\n\nThe 'peace of God, which transcends all understanding' is a supernatural guard over our hearts and minds. Jesus reminds us that our Heavenly Father knows what we need. When we seek His kingdom first, all these concerns find their proper place.\n\nToday, spend time not just talking to God, but thanking Him. Gratitude is the key that unlocks the door to peace.",
    reflectionQuestion: 'What is one specific worry you can hand over to God in prayer right now?',
  },
  {
    day: 5,
    readings: ['Psalm 119:105-112', 'Hebrews 4:12-13'],
    description: 'The Living Word',
    teachingTitle: 'A Lamp and a Light',
    teachingText: "The Bible is not a static history book; it is 'alive and active.' It is described as a lamp to our feet and a light to our path. In a world of confusing messages, Scripture provides the stable truth we need to navigate.\n\nHebrews explains that God's Word penetrates deep, judging the thoughts and attitudes of the heart. It reveals our true selves and points us toward the Truth. When we read it, we aren't just gaining information; we are being transformed.\n\nMake it a habit to let the Word have the final say in your decisions. It is the solid ground upon which our faith is built.",
    reflectionQuestion: 'When was the last time a specific verse gave you clarity in a difficult situation?',
  },
  {
    day: 6,
    readings: ['John 13:1-17', '1 Corinthians 12:12-27'],
    description: 'Community and Service',
    teachingTitle: 'The Body of Christ',
    teachingText: "Following Jesus was never meant to be a private, isolated journey. We are called to be part of a community—the Body of Christ. Just as a human body has many parts with different functions, the Church is diverse yet unified.\n\nJesus modeled this through service, washing His disciples' feet. He told them, 'I have set you an example that you should do as I have done for you.' We find our greatest fulfillment when we use our unique gifts to serve others.\n\nWhen we support one another, the world sees a reflection of God's love. We were created for connection.",
    reflectionQuestion: 'How can you use your unique gifts to encourage someone else in your church community this week?',
  },
  {
    day: 7,
    readings: ['Matthew 28:16-20', 'Acts 1:1-8'],
    description: 'The Great Commission',
    teachingTitle: 'Go and Make Disciples',
    teachingText: "A foundation is only as good as what is built upon it. Jesus' final words to His followers were a call to action: 'Go and make disciples of all nations.' This isn't just for 'professional' missionaries; it's the calling of every believer.\n\nWe are empowered by the Holy Spirit to be witnesses. This means sharing our story—what God has done in our lives—with those around us. You don't need to have all the answers; you just need to share the Light you've found.\n\nAs you conclude this 7-day journey, remember that Jesus is with you always, to the very end of the age. Your mission starts today, right where you are.",
    reflectionQuestion: 'Who is one person in your life who needs to hear about the hope you have in Christ?',
  },
];

// ── The plans ──────────────────────────────────────────────────────────

const GOSPELS = ['Matthew', 'Mark', 'Luke', 'John'];
const PAUL = ['Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon'];
const PROPHETS = ['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel'];

function buildPlans(): ReadingPlan[] {
  const psalms = chaptersOf(['Psalms']);
  const proverbs = chaptersOf(['Proverbs']);
  const otNarrative = chaptersOf(OT.filter((b) => b !== 'Psalms' && b !== 'Proverbs'));
  const ntAndWisdom = interleave(chaptersOf(NT), interleave(psalms, proverbs));

  const plan = (p: Omit<ReadingPlan, 'totalChapters' | 'duration'> & { chapters: number }): ReadingPlan => {
    const { chapters, ...rest } = p;
    return { ...rest, totalChapters: chapters, duration: `${p.totalDays} days` };
  };

  return [
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
      id: 'foundations-faith',
      name: 'Foundations of Faith',
      description: 'Seven days on the core pillars of the Christian walk',
      intro:
        'A deep dive into the core pillars of the Christian faith: God as Creator, the gift of grace, life in the Spirit, prayer, the Word, the church and the Great Commission. Each day has a short devotional and a question to reflect on. Perfect for new believers and anyone wanting to strengthen their roots.',
      totalDays: 7,
      minutesPerDay: 10,
      chapters: 14,
      countNoun: 'readings',
      tags: ['start', 'short'],
      cover: { gradient: 'from-emerald-500 via-teal-500 to-cyan-500', icon: 'sprout' },
      reward: 'You built on a solid foundation.',
      dailyReadings: FOUNDATIONS,
    }),
    plan({
      id: 'psalms-proverbs',
      name: 'Psalms & Proverbs',
      description: 'All 150 Psalms and 31 Proverbs in a month',
      intro:
        'Pray the Psalms and gain the practical wisdom of Proverbs. Each day brings around five Psalms for worship and one chapter of Proverbs — one for every day of the month.',
      totalDays: 31,
      minutesPerDay: minutes(181, 31),
      chapters: 181,
      tags: ['wisdom', 'short'],
      cover: { gradient: 'from-violet-500 via-purple-500 to-fuchsia-500', icon: 'music' },
      reward: 'You prayed every Psalm and read every Proverb.',
      dailyReadings: fromTracks(31, [psalms, proverbs]).map((d, i) => ({
        ...d,
        teachingTitle: WISDOM_TEACHING[i]?.title,
        teachingText: WISDOM_TEACHING[i]?.text,
        reflectionQuestion: WISDOM_TEACHING[i]?.question,
      })),
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

/** "Genesis 1-3" → three chapter passages; "John 1:1-5" → one passage with verses. */
export function expandReading(ref: string): Passage[] {
  const m = ref.trim().match(/^(.+?)\s+(\d+)(?:-(\d+))?(?::(\d+)(?:-(\d+))?)?$/);
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
