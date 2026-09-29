import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  Compass,
  Handshake,
  HandHeart,
  Lightbulb,
  MessageCircle,
  MessageSquareHeart,
  NotebookPen,
  Sparkles,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

/**
 * Everything on the Resources page. The page's layout (favourites, order,
 * hidden items) is each person's own; this is what can go in it.
 */

export interface ResourceItem {
  id: string;
  title: string;
  /** One line saying what it is */
  subtitle: string;
  icon: LucideIcon;
  tint: string;
  /** Where it opens (a page), or an interactive session to read */
  to?: string;
  session?: string;
  /** Extra words people might search for */
  keywords?: string;
}

export interface ResourceSection {
  id: string;
  title: string;
  items: string[];
}

export const tint = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300',
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300',
  pink: 'bg-pink-50 text-pink-600 dark:bg-pink-950/50 dark:text-pink-300',
  teal: 'bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-300',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export const SESSIONS = [
  { name: 'Prayer', description: 'Deepening your conversation with God' },
  { name: 'Humility', description: 'The path to spiritual greatness' },
  { name: 'Giving', description: 'The heart of generosity' },
  { name: 'Faith', description: 'Trusting God in all seasons' },
  { name: 'Word of God', description: 'The lamp to our feet' },
];

export const sessionId = (name: string) => `session-${name.toLowerCase().replace(/\s+/g, '-')}`;

export const RESOURCE_ITEMS: ResourceItem[] = [
  // Grow
  { id: 'plans', title: 'Bible Plans', subtitle: 'Daily reading plans to follow', icon: BookOpen, tint: tint.blue, to: '/bible-reading-plans', keywords: 'reading plan devotional' },
  { id: 'notes', title: 'My Notes', subtitle: 'Your sermon and Bible study notes', icon: NotebookPen, tint: tint.violet, to: '/bible-notes', keywords: 'notes sermon' },
  // Connect
  { id: 'chats', title: 'Messages', subtitle: 'Group chats, private chats and calls', icon: MessageCircle, tint: tint.indigo, to: '/group-chats', keywords: 'group chats chat call video' },
  { id: 'social', title: 'Social Circle', subtitle: 'Find and add friends from church', icon: Users, tint: tint.amber, to: '/social', keywords: 'friends people members' },
  { id: 'prayer', title: 'Prayer Wall', subtitle: 'Share requests and pray for others', icon: HandHeart, tint: tint.pink, to: '/prayer', keywords: 'prayer request praise' },
  { id: 'events', title: 'Events & News', subtitle: "What's happening at church", icon: CalendarDays, tint: tint.rose, to: '/news', keywords: 'events news announcements' },
  { id: 'fellowships', title: 'Campus Fellowships', subtitle: 'Student fellowships near you', icon: UsersRound, tint: tint.green, to: '/campus-fellowships', keywords: 'believers connect students university college' },
  { id: 'new', title: 'New here?', subtitle: 'Start your journey with us', icon: Compass, tint: tint.teal, to: '/new-here', keywords: 'new to faith visitor first time' },
  // Serve
  { id: 'hub', title: 'Ministry Hub', subtitle: 'Choir, ushering, evangelism and every team', icon: Handshake, tint: tint.pink, to: '/groups', keywords: 'life group groups teams departments choir ministry' },
  { id: 'serve', title: 'Serve', subtitle: 'Find the right team to join', icon: Sparkles, tint: tint.orange, to: '/serve', keywords: 'volunteer join team' },
  { id: 'team-follow', title: 'Team Follow Up', subtitle: 'Your list of people to call and care for', icon: ClipboardList, tint: tint.indigo, to: '/follow-up-team', keywords: 'follow up visitors call' },
  { id: 'feedback', title: 'Service feedback', subtitle: 'Tell us how the service went', icon: MessageSquareHeart, tint: tint.teal, to: '/follow-up', keywords: 'follow up feedback survey suggestions' },
  { id: 'building', title: 'Building Campaign', subtitle: 'Our new church building', icon: Building2, tint: tint.slate, to: '/building-campaign', keywords: 'building project give pledge' },
  // Learn
  ...SESSIONS.map((s) => ({
    id: sessionId(s.name),
    title: s.name,
    subtitle: s.description,
    icon: Lightbulb,
    tint: tint.amber,
    session: s.name,
    keywords: 'interactive session study',
  })),
];

export const itemById = new Map(RESOURCE_ITEMS.map((i) => [i.id, i]));

export const DEFAULT_SECTIONS: ResourceSection[] = [
  { id: 'grow', title: 'Grow', items: ['plans', 'notes'] },
  { id: 'connect', title: 'Connect', items: ['chats', 'social', 'prayer', 'events', 'fellowships', 'new'] },
  { id: 'serve', title: 'Serve', items: ['hub', 'serve', 'team-follow', 'feedback', 'building'] },
  { id: 'learn', title: 'Interactive sessions', items: SESSIONS.map((s) => sessionId(s.name)) },
];

export const DEFAULT_FAVOURITES = ['plans', 'notes', 'chats', 'prayer'];
