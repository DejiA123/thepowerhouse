import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, Loader2, Share2 } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBiblePreferences } from '@/hooks/useBiblePreferences';
import { normalizeBookApiName } from '@/components/bible/bookUtils';
import { scriptureForDaysAgo } from '@/utils/dailyScriptureUtils';
import { appAlert } from '@/lib/appAlert';
import { cn } from '@/lib/utils';

/** Translations the verse of the day can be shown in (KJV is built in, so it shows instantly and offline) */
const TRANSLATIONS = [
  { code: 'KJV', id: 'KJV', name: 'King James Version' },
  { code: 'NKJV', id: 'NKJV', name: 'New King James Version' },
  { code: 'ESV', id: 'ESV', name: 'English Standard Version' },
  { code: 'NLT', id: 'NLT', name: 'New Living Translation' },
  { code: 'NASB', id: 'NASB', name: 'New American Standard Bible' },
  { code: 'AMP', id: 'AMP', name: 'Amplified Bible' },
  { code: 'MSG', id: 'MSG', name: 'The Message' },
  { code: 'ASV', id: '06125adad2d5898a-01', name: 'American Standard Version' },
];

/** The Bible's translation setting as a short code ("KJV", "NKJV"…) */
const readingCode = (version: string) =>
  /^de4e12af7f28f599/i.test(version) ? 'KJV' : /^06125adad2d5898a/i.test(version) ? 'ASV' : version.toUpperCase();

const CHOICE_KEY = 'votd_translation_v1';
const TEXT_KEY = 'votd_text_v1';
/** How far back the previous days go */
const MAX_DAYS_BACK = 365;

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

/** Verses already fetched in other translations, so they show at once next time */
const savedText = (code: string, reference: string): string | null => readJson<Record<string, string>>(TEXT_KEY, {})[`${code}|${reference}`] ?? null;

const saveText = (code: string, reference: string, text: string) => {
  try {
    const all = readJson<Record<string, string>>(TEXT_KEY, {});
    delete all[`${code}|${reference}`];
    all[`${code}|${reference}`] = text;
    const keys = Object.keys(all);
    keys.slice(0, Math.max(0, keys.length - 80)).forEach((k) => delete all[k]);
    localStorage.setItem(TEXT_KEY, JSON.stringify(all));
  } catch {
    /* storage full: it's fetched again next time */
  }
};

/**
 * A verse on its own can start or end in the middle of someone speaking: drop
 * a quotation mark whose partner is in another verse, so it isn't shown twice
 * next to the card's own quotation marks.
 */
function tidyQuotes(text: string) {
  let t = text.trim();
  const count = (re: RegExp) => (t.match(re) || []).length;
  if (t.endsWith('”') && count(/”/g) > count(/“/g)) t = t.slice(0, -1).trim();
  if (t.startsWith('“') && count(/“/g) > count(/”/g)) t = t.slice(1).trim();
  if (count(/"/g) % 2 === 1) t = t.replace(/^"|"$/, '').trim();
  return t;
}

/** "Psalm 23:1-2" → { book: "psalms", chapter: 23, from: 1, to: 2 } */
function parse(reference: string) {
  const m = /^(.+?) (\d+):(\d+)(?:-(\d+))?$/.exec(reference);
  if (!m) return null;
  const name = m[1] === 'Psalm' ? 'Psalms' : m[1];
  return { book: normalizeBookApiName(name), chapter: Number(m[2]), from: Number(m[3]), to: Number(m[4] || m[3]) };
}

const dayLabel = (daysAgo: number) => {
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
  });
};

/**
 * The verse of the day on the home page: a new verse each day from a bank of
 * well-loved verses, earlier days a tap away, in the translation you choose.
 */
const VerseOfTheDay = () => {
  const navigate = useNavigate();
  const { preferences } = useBiblePreferences();
  const [daysAgo, setDaysAgo] = useState(0);
  const [code, setCode] = useState<string>(() => {
    const chosen = readJson<string | null>(CHOICE_KEY, null);
    if (chosen && TRANSLATIONS.some((t) => t.code === chosen)) return chosen;
    // Until one is chosen: the translation used in the Bible, when it's one of these
    const reading = readingCode(preferences.preferredTranslation || 'KJV');
    return TRANSLATIONS.some((t) => t.code === reading) ? reading : 'KJV';
  });

  const scripture = useMemo(() => scriptureForDaysAgo(daysAgo), [daysAgo]);
  const translation = TRANSLATIONS.find((t) => t.code === code) ?? TRANSLATIONS[0];

  const [text, setText] = useState<{ code: string; reference: string; verse: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // The verse in the chosen translation (KJV is built in; others are looked up once and kept)
  useEffect(() => {
    if (code === 'KJV') {
      setText(null);
      setLoading(false);
      return;
    }
    const known = savedText(code, scripture.reference);
    if (known) {
      setText({ code, reference: scripture.reference, verse: known });
      setLoading(false);
      return;
    }
    const ref = parse(scripture.reference);
    if (!ref) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { enhancedApiBibleService } = await import('@/services/enhancedApiBibleService');
        const chapter = await enhancedApiBibleService.getChapterPreferCached(translation.id, ref.book, ref.chapter);
        const verse = (chapter?.verses ?? [])
          .filter((v) => Number(v.verse) >= ref.from && Number(v.verse) <= ref.to)
          .map((v) => (v.text || '').trim())
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (cancelled) return;
        if (verse && !/has prohibited me from using/i.test(verse)) {
          saveText(code, scripture.reference, verse);
          setText({ code, reference: scripture.reference, verse });
        } else {
          setText(null);
        }
      } catch {
        if (!cancelled) setText(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, scripture.reference, translation.id]);

  // Shown in the chosen translation once it's in; the King James text until then (or offline)
  const inChosen = text && text.code === code && text.reference === scripture.reference;
  const verse = tidyQuotes(inChosen ? text.verse : scripture.verse);
  const shownCode = inChosen ? code : 'KJV';

  const choose = (next: string) => {
    setCode(next);
    try {
      localStorage.setItem(CHOICE_KEY, JSON.stringify(next));
    } catch {
      /* not remembered */
    }
  };

  const openVerse = () => {
    const ref = parse(scripture.reference);
    if (ref) navigate(`/bible?book=${ref.book}&chapter=${ref.chapter}`);
    else navigate('/bible');
  };

  const shareVerse = async () => {
    // Same layout as copying from the Bible page: reference, then the verse
    const share = `${scripture.reference} ${shownCode}
${verse}`;
    try {
      if (navigator.share) await navigator.share({ text: share });
      else {
        await navigator.clipboard.writeText(share);
        appAlert('Verse copied', 'Paste it anywhere to share.', 'success');
      }
    } catch {
      /* share sheet dismissed */
    }
  };

  return (
    <div className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 p-5 text-white shadow-xl shadow-blue-900/20 md:p-7">
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-white/5" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">Verse of the day</p>
          <p className="mt-0.5 text-[13px] font-medium text-white/70">{dayLabel(daysAgo)}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/25"
              aria-label={`Translation: ${translation.name}. Change translation`}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {code}
              <ChevronDown className="h-4 w-4 opacity-80" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-xl">
            <DropdownMenuLabel>Show the verse in</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {TRANSLATIONS.map((t) => (
              <DropdownMenuItem key={t.code} onSelect={() => choose(t.code)} className="gap-3 py-2">
                <span className="w-11 shrink-0 font-semibold">{t.code}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{t.name}</span>
                {t.code === code && <Check className="h-4 w-4 text-blue-600" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className={cn('relative mt-3 font-serif text-[19px] leading-relaxed transition-opacity md:text-2xl', loading && 'opacity-60')}>
        “{verse}”
      </p>
      <p className="relative mt-3 font-semibold">
        {scripture.reference} <span className="ml-1 text-sm font-medium text-white/70">{shownCode}</span>
      </p>

      <div className="relative mt-4 flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <button
            onClick={() => setDaysAgo((d) => Math.min(MAX_DAYS_BACK, d + 1))}
            disabled={daysAgo >= MAX_DAYS_BACK}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 active:scale-95 disabled:opacity-40"
            aria-label="Previous day's verse"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setDaysAgo((d) => Math.max(0, d - 1))}
            disabled={daysAgo === 0}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 active:scale-95 disabled:opacity-30"
            aria-label="Next day's verse"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-2">
          {daysAgo > 0 && (
            <button onClick={() => setDaysAgo(0)} className="hidden rounded-full px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/15 sm:inline-flex">
              Today
            </button>
          )}
          <button onClick={openVerse} className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/30">
            <BookOpen className="h-4 w-4" /> Read
          </button>
          <button onClick={shareVerse} className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/30">
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerseOfTheDay;
