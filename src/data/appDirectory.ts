import {
  BookOpen,
  Building2,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  Clock,
  Compass,
  DoorOpen,
  FileText,
  GraduationCap,
  Guitar,
  HandHeart,
  Headphones,
  Heart,
  HeartHandshake,
  Home,
  LayoutGrid,
  Lightbulb,
  ListMusic,
  MapPin,
  Megaphone,
  MessageCircle,
  MessageSquareHeart,
  Mic,
  Music,
  NotebookPen,
  PenTool,
  PlayCircle,
  Settings,
  Share2,
  Shield,
  Sparkles,
  UserRound,
  Users,
  UsersRound,
  Wallet,
  Church,
  type LucideIcon,
} from 'lucide-react';
import { campusName, church, hasFeature, type FeatureId } from '@/config/church';

/**
 * Every place in the app, in plain words: where it lives, what it's for and
 * what people might type to find it. The tabs, the search, Help and the
 * welcome tour all read from here, so a feature is only ever named one way.
 */

export type SectionId = 'home' | 'bible' | 'church' | 'teams' | 'me';

export interface AppSection {
  id: SectionId;
  title: string;
  /** One line for the tablet sidebar */
  subtitle: string;
  path: string;
  icon: LucideIcon;
}

const ALL_SECTIONS: (AppSection & { feature?: FeatureId })[] = [
  { id: 'home', title: 'Home', subtitle: 'Start here', path: '/', icon: Home },
  { id: 'bible', title: 'Bible', subtitle: 'Read and listen', path: '/bible', icon: BookOpen },
  { id: 'church', title: 'Church', subtitle: 'Watch, give, events', path: '/church', icon: Church },
  { id: 'teams', title: 'Teams', subtitle: 'Choir, ushering and more', path: '/groups', icon: Users, feature: 'teams' },
  { id: 'me', title: 'Me', subtitle: 'Messages, notes, settings', path: '/me', icon: UserRound },
];

/** The tabs (Teams only for churches that use it) */
export const SECTIONS: AppSection[] = ALL_SECTIONS.filter((x) => !x.feature || hasFeature(x.feature));

/** Which tab a page belongs to, so the right one is lit up wherever you are. */
export function sectionForPath(pathname: string): SectionId {
  const p = pathname.toLowerCase();
  if (p === '/' || p === '/intro') return 'home';
  if (p.startsWith('/bible-notes')) return 'me';
  if (p.startsWith('/bible')) return 'bible';
  if (/^\/(groups|serve|follow-up-team|team-follow-up|fellowship-group)/.test(p)) return 'teams';
  if (/^\/(me|settings|group-chats|social$|auth|help|learn|resources|terms-of-service|privacy-policy)/.test(p)) return 'me';
  return 'church';
}

/** Picture colours (a soft gradient behind a white icon). */
export const TILE = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
  red: 'bg-gradient-to-br from-rose-500 to-red-600',
  pink: 'bg-gradient-to-br from-pink-500 to-pink-600',
  amber: 'bg-gradient-to-br from-amber-500 to-amber-600',
  indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
  green: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
  orange: 'bg-gradient-to-br from-orange-400 to-orange-600',
  violet: 'bg-gradient-to-br from-violet-500 to-violet-600',
  teal: 'bg-gradient-to-br from-teal-500 to-teal-600',
  sky: 'bg-gradient-to-br from-sky-400 to-sky-600',
  slate: 'bg-gradient-to-br from-slate-500 to-slate-600',
} as const;

export type TileColor = keyof typeof TILE;

// ── The choir lives at one branch per person: links open yours ──────────
export const CHOIR_BRANCH_KEY = 'choir_last_location';

export const rememberedChoir = (): string | null => {
  try {
    return localStorage.getItem(CHOIR_BRANCH_KEY);
  } catch {
    return null;
  }
};

/** A place in your choir. Without a branch yet, you pick one first and carry on. */
export const choirPath = (query = '') => {
  const branch = rememberedChoir();
  return `${branch ? `/groups/choir/${branch}` : '/groups/choir'}${query}`;
};

export interface Destination {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: TileColor;
  /** Where it lives, as people see it: "Teams › Choir › Singing lessons" */
  crumb: string;
  /** Where it opens; a function when it depends on the person (their choir) */
  path: string | (() => string);
  /** Extra words people might type */
  keywords?: string;
  /** Only when signed out / in */
  when?: 'signed-out' | 'signed-in';
  /** Opens outside the app */
  external?: boolean;
  /** A part of the app the church can switch off */
  feature?: FeatureId;
}

export const pathOf = (d: Destination) => (typeof d.path === 'function' ? d.path() : d.path);

const ALL_DESTINATIONS: Destination[] = [
  // Bible
  { id: 'bible', title: 'Read the Bible', subtitle: 'Read and listen', icon: BookOpen, color: 'blue', crumb: 'Bible', path: '/bible', keywords: 'scripture verse word god read chapter book kjv niv' },
  { id: 'listen', title: 'Listen to the Bible', subtitle: 'The audio Bible, read aloud', icon: Headphones, color: 'blue', crumb: 'Bible › Listen', path: '/bible', keywords: 'audio listen hear play read aloud' },
  { id: 'plans', title: 'Bible plans', subtitle: 'Daily reading plans to follow', icon: CalendarDays, color: 'blue', crumb: 'Me › Learn › Bible plans', path: '/bible-reading-plans', keywords: 'reading plan devotional daily mcheyne spurgeon morning evening year' },

  // Church
  { id: 'watch', feature: 'watch', title: 'Watch', subtitle: 'Live and past services', icon: PlayCircle, color: 'red', crumb: 'Church › Watch', path: '/services?watch=1', keywords: 'live stream sunday service video sermon message preaching youtube teachings online' },
  { id: 'events', feature: 'events', title: "What's on", subtitle: 'Events and news', icon: CalendarDays, color: 'orange', crumb: "Church › What's on", path: '/news', keywords: 'events news announcements calendar programme program this week conference' },
  { id: 'give', feature: 'giving', title: 'Give', subtitle: 'Tithes, offerings and seeds', icon: Heart, color: 'pink', crumb: 'Church › Give', path: '/give', keywords: 'donate offering tithe seed money pay giving card bank' },
  { id: 'prayer', feature: 'prayerWall', title: 'Prayer Wall', subtitle: 'Ask for prayer, pray for others', icon: HandHeart, color: 'amber', crumb: 'Church › Prayer Wall', path: '/prayer', keywords: 'pray prayer request praise report testimony intercession' },
  { id: 'new', feature: 'newHere', title: 'New here?', subtitle: 'Start your journey with us', icon: Compass, color: 'teal', crumb: 'Church › New here?', path: '/new-here', keywords: 'new visitor guest first time welcome faith saved' },
  { id: 'locations', feature: 'locations', title: 'Find a church', subtitle: 'Service times, places and directions', icon: MapPin, color: 'sky', crumb: 'Church › Find a church', path: '/services', keywords: `location address map directions where times ${church.campuses.map((c) => c.name.toLowerCase()).join(' ')}` },
  { id: 'campus', feature: 'campusFellowships', title: 'Campus fellowships', subtitle: 'Believers Connect for students', icon: UsersRound, color: 'green', crumb: 'Church › Campus fellowships', path: '/campus-fellowships', keywords: 'students university college believers connect uog atu tus maynooth cork' },
  { id: 'building', feature: 'buildingCampaign', title: 'Building campaign', subtitle: 'Our new church building', icon: Building2, color: 'slate', crumb: 'Church › Building campaign', path: '/building-campaign', keywords: 'building project pledge construction' },
  { id: 'feedback', feature: 'serviceFeedback', title: 'Service feedback', subtitle: 'Tell us how the service went', icon: MessageSquareHeart, color: 'teal', crumb: 'Church › Service feedback', path: '/follow-up', keywords: 'feedback survey suggestions follow up' },
  { id: 'social-media', feature: 'socialMedia', title: 'Follow us online', subtitle: 'The church on social media', icon: Share2, color: 'violet', crumb: 'Church › Follow us online', path: '/social-media', keywords: 'instagram facebook tiktok youtube social media' },

  // Teams
  { id: 'teams', feature: 'teams', title: 'Teams', subtitle: 'Choir, ushering and every team', icon: Users, color: 'green', crumb: 'Teams', path: '/groups', keywords: 'ministry hub departments groups life groups serve' },
  { id: 'choir', feature: 'choir', title: 'Choir', subtitle: 'Songs, rehearsals and lessons', icon: Music, color: 'blue', crumb: 'Teams › Choir', path: '/groups/choir', keywords: 'choir music worship singing singers praise team branch galway dublin kildare athlone' },
  { id: 'choir-national', feature: 'choirNational', title: church.labels.nationalChoir, subtitle: 'The official national choir portal', icon: Music, color: 'indigo', crumb: 'Teams › Choir › National', path: '/groups/choir/national', keywords: 'national choir tph official portal contributions' },
  { id: 'choir-songs', feature: 'choir', title: 'Choir songs', subtitle: 'Setlists, lyrics and song library', icon: ListMusic, color: 'indigo', crumb: 'Teams › Choir › Songs', path: () => choirPath('?tab=songs'), keywords: 'songs setlist set list lyrics praise worship library learning focus' },
  { id: 'choir-rehearsals', feature: 'choir', title: 'Rehearsal times', subtitle: 'When the choir meets', icon: Clock, color: 'orange', crumb: 'Teams › Choir › Rehearsals', path: () => choirPath('?tab=schedule'), keywords: 'rehearsal practice schedule times calendar soundcheck' },
  { id: 'choir-singing', feature: 'choir', title: 'Singing lessons', subtitle: "Lessons for men's and women's voices", icon: Mic, color: 'blue', crumb: 'Teams › Choir › Singing lessons', path: () => choirPath('?tab=singing'), keywords: 'singing lessons vocal training voice academy course breathing posture' },
  { id: 'choir-male', feature: 'choir', title: "Men's voice exercises", subtitle: 'Vocal training for men', icon: Mic, color: 'blue', crumb: 'Teams › Choir › Singing lessons', path: () => choirPath('?tab=singing&voice=male'), keywords: 'male men man boys bass tenor baritone vocal training exercises voice' },
  { id: 'choir-female', feature: 'choir', title: "Women's voice exercises", subtitle: 'Vocal training for women', icon: Mic, color: 'pink', crumb: 'Teams › Choir › Singing lessons', path: () => choirPath('?tab=singing&voice=female'), keywords: 'female women woman girls soprano alto vocal training exercises voice' },
  { id: 'choir-harmony', feature: 'choir', title: 'Harmony and blending', subtitle: 'Singing parts together', icon: Users, color: 'violet', crumb: 'Teams › Choir › Singing lessons', path: () => choirPath('?tab=lessons&course=vocal-harmony'), keywords: 'harmony satb parts blend blending ear training intervals' },
  { id: 'choir-band', feature: 'choir', title: 'Band', subtitle: 'Tracks and charts for players', icon: Guitar, color: 'violet', crumb: 'Teams › Choir › Band', path: () => choirPath('?tab=band'), keywords: 'band instrumentalists musicians backing tracks chord charts players' },
  { id: 'choir-instruments', feature: 'choir', title: 'Instrument lessons', subtitle: 'Piano, drums, guitar, bass, sax', icon: Guitar, color: 'violet', crumb: 'Teams › Choir › Instrument lessons', path: () => choirPath('?tab=lessons&section=instruments'), keywords: 'instrument piano keyboard keys drums drummer guitar bass saxophone sax masterclass' },
  { id: 'choir-basics', feature: 'choir', title: 'Music basics', subtitle: 'Notes, chords and rhythm', icon: GraduationCap, color: 'teal', crumb: 'Teams › Choir › Music basics', path: () => choirPath('?tab=lessons&section=basics'), keywords: 'music theory basics notes chords keys rhythm beat scale 101 beginner' },
  { id: 'choir-all-lessons', feature: 'choir', title: 'All choir lessons', subtitle: 'Every course in the choir academy', icon: GraduationCap, color: 'blue', crumb: 'Teams › Choir › Lessons', path: () => choirPath('?tab=lessons'), keywords: 'academy courses lessons training worship leading ensemble' },
  { id: 'choir-team', feature: 'choir', title: 'Choir team list', subtitle: "Who's in the choir", icon: UsersRound, color: 'green', crumb: 'Teams › Choir › Team', path: () => choirPath('?tab=roster'), keywords: 'roster members team list choir members' },
  { id: 'choir-songwriting', feature: 'songwriting', title: 'Songwriting studio', subtitle: `Write songs together (${campusName(church.choir.songwritingBranch)})`, icon: PenTool, color: 'violet', crumb: 'Teams › Choir › Songwriting', path: `/groups/choir/${church.choir.songwritingBranch}?tab=songwriting`, keywords: 'songwriting write song lyrics studio' },
  { id: 'choir-contributions', feature: 'choirContributions', title: 'Choir contributions', subtitle: 'Monthly contributions and records', icon: Wallet, color: 'amber', crumb: 'Teams › Choir › Contributions', path: '/groups/choir/contributions', keywords: 'contributions dues monthly payment tracker' },
  { id: 'ushering', feature: 'ushering', title: 'Ushering', subtitle: 'Welcome and help people', icon: DoorOpen, color: 'orange', crumb: 'Teams › Ushering', path: '/groups/ushering', keywords: 'ushers ushering welcome hospitality door seating' },
  { id: 'evangelism', feature: 'evangelism', title: 'Evangelism', subtitle: 'Share the good news', icon: Megaphone, color: 'red', crumb: 'Teams › Evangelism', path: '/groups/evangelism', keywords: 'outreach evangelism soul winning missions street' },
  { id: 'pastoral', feature: 'pastoral', title: 'Pastoral Care', subtitle: 'Care for one another', icon: HeartHandshake, color: 'pink', crumb: 'Teams › Pastoral Care', path: '/groups/pastoral', keywords: 'pastoral care counselling visit support' },
  { id: 'management', feature: 'management', title: 'Management Team', subtitle: 'Planning and coordination', icon: ClipboardList, color: 'slate', crumb: 'Teams › Management Team', path: '/groups/management', keywords: 'management admin leadership planning convention staff' },
  { id: 'serve', feature: 'teams', title: 'Join a team', subtitle: 'Find where you fit', icon: Sparkles, color: 'green', crumb: 'Teams › Join a team', path: '/serve', keywords: 'serve volunteer join help team' },
  { id: 'team-follow', feature: 'teamFollowUp', title: 'Team follow-up', subtitle: 'People to call and care for', icon: ClipboardList, color: 'indigo', crumb: 'Teams › Team follow-up', path: '/follow-up-team', keywords: 'follow up visitors call care list' },

  // Me
  { id: 'messages', title: 'Messages', subtitle: 'Chats and calls with church family', icon: MessageCircle, color: 'indigo', crumb: 'Me › Messages', path: '/group-chats', keywords: 'chat chats message messages group chat call video whatsapp text' },
  { id: 'friends', title: 'Friends', subtitle: 'Find and add friends from church', icon: Users, color: 'amber', crumb: 'Me › Friends', path: '/social', keywords: 'social circle friends people members find' },
  { id: 'notes', title: 'My notes', subtitle: 'Sermon and Bible study notes', icon: NotebookPen, color: 'violet', crumb: 'Me › My notes', path: '/bible-notes', keywords: 'notes sermon notes write journal highlights' },
  { id: 'learn', title: 'Learn', subtitle: 'Bible plans, studies and notes', icon: GraduationCap, color: 'violet', crumb: 'Me › Learn', path: '/learn', keywords: 'learn grow study studies devotional course' },
  { id: 'studies', title: 'Bible studies', subtitle: 'Prayer, faith, giving and more', icon: Lightbulb, color: 'amber', crumb: 'Me › Learn › Studies', path: '/learn', keywords: 'study studies interactive session humility faith word of god' },
  { id: 'settings', title: 'Settings', subtitle: 'Your profile, notifications and display', icon: Settings, color: 'slate', crumb: 'Me › Settings', path: '/settings', keywords: 'settings profile account password notifications text size font dark mode theme language photo' },
  { id: 'help', title: 'Help', subtitle: 'How do I…? and the tour', icon: CircleHelp, color: 'blue', crumb: 'Me › Help', path: '/help', keywords: 'help how tour guide lost stuck support contact' },
  { id: 'everything', title: 'Everything in the app', subtitle: 'Every feature, A to Z', icon: LayoutGrid, color: 'slate', crumb: 'Me › Everything', path: '/resources', keywords: 'resources all features everything list favourites' },
  { id: 'signin', title: 'Sign in', subtitle: 'Or create an account', icon: UserRound, color: 'blue', crumb: 'Me › Sign in', path: '/auth', keywords: 'sign in log in login register account create join', when: 'signed-out' },
  { id: 'terms', title: 'Terms of service', subtitle: 'The rules for using the app', icon: FileText, color: 'slate', crumb: 'Me › Terms', path: '/terms-of-service', keywords: 'terms conditions legal' },
  { id: 'privacy', title: 'Privacy', subtitle: 'How we look after your data', icon: Shield, color: 'slate', crumb: 'Me › Privacy', path: '/privacy-policy', keywords: 'privacy data policy gdpr' },
];

/** Every place this church uses (parts it has switched off are left out everywhere) */
export const DESTINATIONS: Destination[] = ALL_DESTINATIONS.filter((d) => !d.feature || hasFeature(d.feature));

/** A place by its id (undefined for a part this church has switched off) */
export const destination = (id: string): Destination | undefined => DESTINATIONS.find((d) => d.id === id);

/** The big picture buttons on Home, in order. */
const ALL_HOME_TILES: { id: string; title: string; subtitle: string; icon: LucideIcon; color: TileColor; to: string | (() => string); feature?: FeatureId }[] = [
  { id: 'bible', title: 'Read the Bible', subtitle: 'Read and listen', icon: BookOpen, color: 'blue', to: '/bible' },
  { id: 'watch', feature: 'watch', title: 'Watch', subtitle: 'Live and past', icon: PlayCircle, color: 'red', to: '/services?watch=1' },
  { id: 'give', feature: 'giving', title: 'Give', subtitle: 'Tithes and offerings', icon: Heart, color: 'pink', to: '/give' },
  { id: 'prayer', feature: 'prayerWall', title: 'Pray', subtitle: 'Ask for prayer', icon: HandHeart, color: 'amber', to: '/prayer' },
  { id: 'messages', title: 'Messages', subtitle: 'Chat with church', icon: MessageCircle, color: 'indigo', to: '/group-chats' },
  { id: 'teams', feature: 'teams', title: 'My team', subtitle: 'Choir and more', icon: Users, color: 'green', to: '/groups' },
  { id: 'events', feature: 'events', title: "What's on", subtitle: 'Events this week', icon: CalendarDays, color: 'orange', to: '/news' },
  { id: 'learn', title: 'Learn', subtitle: 'Plans and lessons', icon: GraduationCap, color: 'violet', to: '/learn' },
];
export const HOME_TILES = ALL_HOME_TILES.filter((t) => !t.feature || hasFeature(t.feature));

/** Help: common questions, each answered by taking you there. */
const ALL_HOW_DO_I: { question: string; to: string }[] = [
  { question: 'Give my tithe or offering?', to: 'give' },
  { question: 'Watch the service?', to: 'watch' },
  { question: 'Read or listen to the Bible?', to: 'bible' },
  { question: 'Ask for prayer?', to: 'prayer' },
  { question: 'Message my team or a friend?', to: 'messages' },
  { question: 'Find choir singing lessons?', to: 'choir-singing' },
  { question: 'See choir rehearsal times?', to: 'choir-rehearsals' },
  { question: 'Join a team?', to: 'serve' },
  { question: "See what's happening this week?", to: 'events' },
  { question: 'Find a church near me?', to: 'locations' },
  { question: 'Change my name, photo or text size?', to: 'settings' },
];
export const HOW_DO_I = ALL_HOW_DO_I.filter((q) => DESTINATIONS.some((d) => d.id === q.to));

/** Search suggestions shown before anything is typed. */
export const POPULAR_SEARCHES = [
  ...(hasFeature('giving') ? ['Give'] : []),
  ...(hasFeature('watch') ? ['Sunday service'] : []),
  'Psalm 23',
  ...(hasFeature('choir') ? ['Choir lessons', 'Rehearsal times'] : []),
  ...(hasFeature('prayerWall') ? ['Prayer'] : []),
];
