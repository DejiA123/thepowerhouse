/**
 * The 66 books in their traditional groups, with a short code and a one-line
 * summary each (used by the book & chapter picker).
 */

export type Testament = 'old' | 'new';

export interface BookGroup {
  key: string;
  label: string;
  testament: Testament;
  books: string[]; // api names, in canonical order
}

export const BOOK_GROUPS: BookGroup[] = [
  { key: 'law', label: 'The Law', testament: 'old', books: ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy'] },
  {
    key: 'history', label: 'History', testament: 'old',
    books: ['joshua', 'judges', 'ruth', '1-samuel', '2-samuel', '1-kings', '2-kings', '1-chronicles', '2-chronicles', 'ezra', 'nehemiah', 'esther'],
  },
  { key: 'wisdom', label: 'Poetry & Wisdom', testament: 'old', books: ['job', 'psalms', 'proverbs', 'ecclesiastes', 'song-of-solomon'] },
  { key: 'major', label: 'Major Prophets', testament: 'old', books: ['isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel'] },
  {
    key: 'minor', label: 'Minor Prophets', testament: 'old',
    books: ['hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi'],
  },
  { key: 'gospels', label: 'Gospels', testament: 'new', books: ['matthew', 'mark', 'luke', 'john'] },
  { key: 'acts', label: 'Church History', testament: 'new', books: ['acts'] },
  {
    key: 'paul', label: "Paul's Letters", testament: 'new',
    books: ['romans', '1-corinthians', '2-corinthians', 'galatians', 'ephesians', 'philippians', 'colossians', '1-thessalonians', '2-thessalonians', '1-timothy', '2-timothy', 'titus', 'philemon'],
  },
  { key: 'general', label: 'General Letters', testament: 'new', books: ['hebrews', 'james', '1-peter', '2-peter', '1-john', '2-john', '3-john', 'jude'] },
  { key: 'prophecy', label: 'Prophecy', testament: 'new', books: ['revelation'] },
];

/** Badge, card and heading colours per group, light and dark. */
export const GROUP_COLORS: Record<string, { badge: string; tint: string; ink: string; dot: string }> = {
  law: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300', tint: 'bg-amber-100/80 dark:bg-amber-400/10', ink: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-600' },
  history: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300', tint: 'bg-emerald-100/80 dark:bg-emerald-400/10', ink: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-600' },
  wisdom: { badge: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300', tint: 'bg-violet-100/80 dark:bg-violet-400/10', ink: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-600' },
  major: { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300', tint: 'bg-rose-100/80 dark:bg-rose-400/10', ink: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-600' },
  minor: { badge: 'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300', tint: 'bg-orange-100/80 dark:bg-orange-400/10', ink: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-600' },
  gospels: { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300', tint: 'bg-blue-100/80 dark:bg-blue-400/10', ink: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-600' },
  acts: { badge: 'bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300', tint: 'bg-teal-100/80 dark:bg-teal-400/10', ink: 'text-teal-700 dark:text-teal-300', dot: 'bg-teal-600' },
  paul: { badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300', tint: 'bg-indigo-100/80 dark:bg-indigo-400/10', ink: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-600' },
  general: { badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300', tint: 'bg-cyan-100/80 dark:bg-cyan-400/10', ink: 'text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-600' },
  prophecy: { badge: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-400/15 dark:text-fuchsia-300', tint: 'bg-fuchsia-100/80 dark:bg-fuchsia-400/10', ink: 'text-fuchsia-700 dark:text-fuchsia-300', dot: 'bg-fuchsia-600' },
};

export const BOOK_ABBR: Record<string, string> = {
  genesis: 'Gen', exodus: 'Exo', leviticus: 'Lev', numbers: 'Num', deuteronomy: 'Deu',
  joshua: 'Jos', judges: 'Jdg', ruth: 'Rut', '1-samuel': '1Sa', '2-samuel': '2Sa', '1-kings': '1Ki', '2-kings': '2Ki',
  '1-chronicles': '1Ch', '2-chronicles': '2Ch', ezra: 'Ezr', nehemiah: 'Neh', esther: 'Est',
  job: 'Job', psalms: 'Psa', proverbs: 'Pro', ecclesiastes: 'Ecc', 'song-of-solomon': 'Sng',
  isaiah: 'Isa', jeremiah: 'Jer', lamentations: 'Lam', ezekiel: 'Eze', daniel: 'Dan',
  hosea: 'Hos', joel: 'Joe', amos: 'Amo', obadiah: 'Oba', jonah: 'Jon', micah: 'Mic', nahum: 'Nah',
  habakkuk: 'Hab', zephaniah: 'Zep', haggai: 'Hag', zechariah: 'Zec', malachi: 'Mal',
  matthew: 'Mat', mark: 'Mrk', luke: 'Luk', john: 'Jhn', acts: 'Act',
  romans: 'Rom', '1-corinthians': '1Co', '2-corinthians': '2Co', galatians: 'Gal', ephesians: 'Eph',
  philippians: 'Php', colossians: 'Col', '1-thessalonians': '1Th', '2-thessalonians': '2Th',
  '1-timothy': '1Ti', '2-timothy': '2Ti', titus: 'Tit', philemon: 'Phm',
  hebrews: 'Heb', james: 'Jas', '1-peter': '1Pe', '2-peter': '2Pe', '1-john': '1Jn', '2-john': '2Jn', '3-john': '3Jn',
  jude: 'Jud', revelation: 'Rev',
};

export const BOOK_SUMMARY: Record<string, string> = {
  genesis: "Beginnings: creation, the fall, the flood, and God's covenant with Abraham, Isaac, Jacob and Joseph.",
  exodus: 'God rescues Israel from slavery in Egypt, gives the Law at Sinai, and dwells among His people.',
  leviticus: 'How a holy God is worshipped: offerings, priests, feasts and the call to be holy.',
  numbers: "Israel's forty years in the wilderness, from Sinai to the edge of the Promised Land.",
  deuteronomy: "Moses' farewell sermons: remember the Lord, love Him with all your heart, and obey.",
  joshua: 'Joshua leads Israel across the Jordan to take the Promised Land.',
  judges: 'Cycles of turning away and rescue, as God raises up judges like Deborah, Gideon and Samson.',
  ruth: "A story of loyal love and redemption: Ruth, Naomi and Boaz, in King David's family line.",
  '1-samuel': 'Samuel the prophet, Saul the first king, and the rise of young David.',
  '2-samuel': "David's reign as king: his victories, his sin, and God's everlasting promise to him.",
  '1-kings': "Solomon's wisdom and temple, the kingdom divided, and Elijah the prophet.",
  '2-kings': 'Elisha, the kings of Israel and Judah, and the fall of both kingdoms into exile.',
  '1-chronicles': "Israel's family line and David's reign, told with an eye on true worship.",
  '2-chronicles': "Solomon's temple and the kings of Judah, from glory to exile and a promise of return.",
  ezra: 'The exiles come home to rebuild the temple and return to God\'s Word.',
  nehemiah: 'Nehemiah leads the rebuilding of Jerusalem\'s walls amid opposition, prayer and renewal.',
  esther: 'A Jewish queen in Persia risks her life, and God quietly saves His people.',
  job: 'A righteous man suffers, questions, and meets God in the whirlwind.',
  psalms: "Israel's songbook of praise, lament, trust and prayer: 150 songs for every season of life.",
  proverbs: 'Wise sayings for everyday life; the fear of the Lord is the beginning of wisdom.',
  ecclesiastes: 'Life “under the sun” is fleeting; fear God and keep His commandments.',
  'song-of-solomon': 'A poem celebrating the love between a bride and her beloved.',
  isaiah: 'Judgement and comfort, the Holy One of Israel, and the promised suffering Servant.',
  jeremiah: 'The weeping prophet warns Judah before the exile and promises a new covenant.',
  lamentations: 'Five poems of grief over fallen Jerusalem: great is God\'s faithfulness.',
  ezekiel: "Visions in exile: God's glory departs and returns, and dry bones live again.",
  daniel: 'Faithfulness in Babylon, the lions\' den, and visions of God\'s everlasting kingdom.',
  hosea: "A prophet's marriage pictures God's unfailing love for unfaithful Israel.",
  joel: 'The day of the Lord, a call to return, and the promise of the Spirit poured out.',
  amos: 'A shepherd prophet calls for justice to roll down like waters.',
  obadiah: 'Judgement on Edom for its pride, and the kingdom belonging to the Lord.',
  jonah: "A reluctant prophet, a great fish, and God's mercy for Nineveh.",
  micah: 'Do justly, love mercy, walk humbly; a ruler will come from Bethlehem.',
  nahum: "Nineveh's fall: the Lord is slow to anger and great in power.",
  habakkuk: 'A prophet wrestles with God and learns that the righteous shall live by faith.',
  zephaniah: 'The day of the Lord is near, and God rejoices over His people with singing.',
  haggai: 'Put God first: a call to finish rebuilding the temple.',
  zechariah: 'Visions of restoration and the coming King, humble and riding on a donkey.',
  malachi: 'A call to wholehearted worship, and the promise of the messenger before the Lord.',
  matthew: 'Jesus the promised King: His birth, teaching, miracles, death and resurrection.',
  mark: 'The fast-moving story of Jesus, the Servant who came to give His life.',
  luke: 'A careful account of Jesus, the Saviour who seeks and saves the lost.',
  john: 'Signs and “I am” sayings, written so that you may believe Jesus is the Son of God.',
  acts: 'The Holy Spirit comes, and the church spreads from Jerusalem to Rome.',
  romans: 'The gospel explained: righteousness by faith, life in the Spirit, and God\'s plan.',
  '1-corinthians': 'Paul corrects a divided church: unity, holiness, spiritual gifts and love.',
  '2-corinthians': "Paul's heartfelt letter on ministry, suffering and God's strength in weakness.",
  galatians: 'Freedom in Christ: we are saved by grace through faith, not by the Law.',
  ephesians: 'Every spiritual blessing in Christ, one body in Him, and the armour of God.',
  philippians: 'A letter of joy from prison: to live is Christ, to die is gain.',
  colossians: 'Christ is supreme over all, and complete life is found in Him.',
  '1-thessalonians': 'Encouragement for a young church and hope in the Lord\'s return.',
  '2-thessalonians': "Stand firm while waiting for Christ's return, and keep working.",
  '1-timothy': 'Guidance for leading the church, sound teaching and godly living.',
  '2-timothy': "Paul's last letter: guard the gospel, preach the Word, finish the race.",
  titus: 'Order in the church and good works that flow from God\'s grace.',
  philemon: 'A personal appeal to welcome back Onesimus as a brother in Christ.',
  hebrews: 'Jesus is greater: the perfect High Priest of a better covenant. Hold fast in faith.',
  james: 'Practical faith: faith without works is dead.',
  '1-peter': 'Hope and holiness for believers suffering for their faith.',
  '2-peter': 'Grow in grace, beware false teachers, and wait for the day of the Lord.',
  '1-john': 'God is light and God is love: assurance for those who believe.',
  '2-john': 'Walk in truth and love, and beware of deceivers.',
  '3-john': 'Praise for faithful hospitality to those serving the truth.',
  jude: 'Contend for the faith, and be kept by God who is able to keep you from falling.',
  revelation: "Visions of the risen Christ, the defeat of evil, and the new heaven and new earth.",
};

export const groupOfBook = (apiName: string) => BOOK_GROUPS.find((g) => g.books.includes(apiName));
