/**
 * Everything that makes this app one particular church's app.
 *
 * Church Space (see PLATFORM) runs the same app for many churches. The Power
 * House's profile lives here in code and is what its own address shows. On the
 * Church Space address, each church's profile comes from the database (made by
 * "Create your church space") and is put in `church` before the app starts
 * (see lib/churchSpace). Nothing else in the app should name the church, its
 * places, links or contact details: read them from `church`.
 *
 * Plain data only (no React or browser code): vite.config.ts reads it too,
 * for the page title, sharing details and install details (manifest).
 */

/** The product that runs every church's app */
export const PLATFORM = {
  name: 'Church Space',
  /** The general address, where people find, join and create churches */
  url: 'https://churchspaceapp.vercel.app',
  /** Addresses that work as Church Space (space.localhost: for trying it on a computer) */
  hosts: ['churchspaceapp.vercel.app', 'space.localhost'],
  /** The church that every other address opens (The Power House's own) */
  defaultChurchId: '7a1c0de5-0000-4000-8000-000000000001',
  icon192: '/space/icon-192.png',
  icon512: '/space/icon-512.png',
  themeColor: '#2563eb',
};

/** Words a church's link can't be, because they're pages of the app (the database has the same list) */
export const RESERVED_SLUGS = [
  'admin', 'api', 'assets', 'auth', 'banners', 'bible', 'bible-notes', 'bible-reading-plans', 'brand', 'building-campaign',
  'c', 'campus-fellowship', 'campus-fellowships', 'church', 'church-space', 'churchspace', 'create-church', 'debug-email',
  'editor-frame', 'email-confirmation', 'find', 'follow-up', 'follow-up-team', 'fonts', 'fellowship-group', 'give',
  'google-sign-in', 'group-chats', 'groups', 'help', 'icons', 'install', 'intro', 'join', 'learn', 'locations',
  'manifest', 'me', 'new-here', 'news', 'prayer', 'privacy-policy', 'reset-password', 'resources', 'serve', 'services',
  'settings', 'social', 'social-media', 'space', 'splash', 'sw', 'team-follow-up', 'terms-of-service', 'test', 'workbox',
];

/** A church's link from its name ("Grace Chapel Dublin" → "gracechapeldublin") */
export const slugFromName = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(the|church|of|and)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 30);

export interface Campus {
  id: string;
  name: string;
  address: string;
  /** First line of the address, for compact cards. */
  street: string;
  times: { sunday: string; bibleStudy: string; prayer: string };
  phone: string;
  email: string;
  whatsappGroup: string;
  coordinates: { lat: number; lng: number };
}

export interface SocialLink {
  handle: string;
  url: string;
}

/**
 * Parts of the app a church can switch off (the Bible, messages, notes,
 * settings and help are always there).
 */
export type FeatureId =
  | 'watch'
  | 'giving'
  | 'prayerWall'
  | 'events'
  | 'newHere'
  | 'locations'
  | 'campusFellowships'
  | 'buildingCampaign'
  | 'serviceFeedback'
  | 'socialMedia'
  | 'teams'
  | 'choir'
  | 'choirNational'
  | 'choirContributions'
  | 'songwriting'
  | 'ushering'
  | 'evangelism'
  | 'pastoral'
  | 'management'
  | 'teamFollowUp';

export interface ChurchProfile {
  /** The church's link ("thepowerhouse") */
  id: string;
  /** Its id in the database */
  dbId: string;
  /** Accent colour: one of PALETTES (config/palettes) or "#rrggbb" */
  colour: string;
  /** Town and country, for finding it ("Galway, Ireland") */
  city: string;
  /** Short name, as on the Home Screen and in the header: "The Power House" */
  name: string;
  /** Full name: "The Power House International" */
  fullName: string;
  /** Short letters for tight spaces: "TPH" */
  initials: string;
  /** Who the app belongs to, for the legal pages and receipts */
  legalName: string;
  /** One line about the app (search results, links shared in chats) */
  description: string;
  website: string;
  /** Where the app itself lives */
  appUrl: string;
  contact: {
    email: string;
    /** General enquiries, for newcomers */
    infoEmail: string;
    privacyEmail: string;
    phone: string;
    address: string;
  };
  brand: {
    /** The logo beside the name in the header and sidebar */
    logo: string;
    /** Square picture for the lock screen while audio plays */
    artwork: string;
    icon192: string;
    icon512: string;
    maskable512: string;
    /** Header colour on Android and in the app switcher */
    themeColor: string;
    backgroundColor: string;
  };
  youtube: { channelId: string; handle: string };
  social: { tiktok?: SocialLink; facebook?: SocialLink; instagram?: SocialLink; youtube?: SocialLink; x?: SocialLink };
  /** When services are streamed live, in local time: day 0 = Sunday, hours 0–23 */
  liveTimes: { day: number; from: number; to: number }[];
  /** The same, in words */
  liveTimesLabel: string;
  giving: { bankName: string; accountName: string; iban: string; bic: string };
  campuses: Campus[];
  locale: {
    /** For dates written out in full */
    language: string;
    timeZone: string;
    /** Whose laws the terms of service follow */
    lawCountry: string;
    /** A phone number as people there write it */
    phoneExample: string;
  };
  /** The picture banners on Home (photos in public/banners), in order */
  banners: {
    title: string;
    subtitle: string;
    /** The page it opens */
    to: string;
    image: string;
    /** Which part of the photo to keep in view */
    position: string;
    /** Shown while the photo loads, or if it can't */
    fallback: string;
    cta?: string;
    feature?: FeatureId;
  }[];
  /** The choir: which campuses have a branch (in the order shown), and the branch with the songwriting studio and prayer roster */
  choir: { branches: string[]; songwritingBranch: string };
  /** Names of church-specific things */
  labels: {
    choirAcademy: string;
    nationalChoir: string;
  };
  features: Record<FeatureId, boolean>;
}

export const THE_POWER_HOUSE: ChurchProfile = {
  id: 'thepowerhouse',
  dbId: '7a1c0de5-0000-4000-8000-000000000001',
  colour: 'blue',
  city: 'Galway, Ireland',
  name: 'The Power House',
  fullName: 'The Power House International',
  initials: 'TPH',
  legalName: 'The Power House International Church',
  description: 'The Power House International Church App - Connect, Grow, Serve',
  website: 'https://www.thepowerhouseinternational.org',
  appUrl: 'https://thepowerhouseintl.vercel.app',
  contact: {
    email: 'contact.thepowerhouse@gmail.com',
    infoEmail: 'info@thepowerhouseinternational.org',
    privacyEmail: 'privacy@thepowerhouseinternational.org',
    phone: '089 953 4714',
    address: 'The Power House International Church, Unit 22 Marangonii House, Monivea Rd, Ballybrit Heights, Galway, H91 958A',
  },
  brand: {
    logo: '/brand/logo-144.png',
    artwork: '/church-logo.png',
    icon192: '/icons/icon-192.png',
    icon512: '/icons/icon-512.png',
    maskable512: '/icons/maskable-512.png',
    themeColor: '#1d3fd6',
    backgroundColor: '#ffffff',
  },
  youtube: { channelId: 'UC35azCG6jqVkR2G8aH91v4A', handle: '@thepowerhouseintl' },
  social: {
    tiktok: { handle: '@thepowerhouseintl', url: 'https://www.tiktok.com/@thepowerhouseintl' },
    facebook: { handle: '@ThePowerHouseWorldWide', url: 'https://www.facebook.com/ThePowerHouseWorldWide' },
    instagram: { handle: '@thepowerhouseintl', url: 'https://www.instagram.com/thepowerhouseintl' },
    youtube: { handle: '@thepowerhouseintl', url: 'https://www.youtube.com/@thepowerhouseintl' },
    x: { handle: '@ThePowerHIntl', url: 'https://twitter.com/ThePowerHIntl' },
  },
  liveTimes: [
    { day: 0, from: 10, to: 13 },
    { day: 3, from: 19, to: 21 },
  ],
  liveTimesLabel: 'Sundays 10 AM · Wednesdays 7 PM',
  giving: {
    bankName: 'Allied Irish Banks',
    accountName: 'The Power House International',
    iban: 'IE85AIBK93745222068064',
    bic: 'AIBKIE2D',
  },
  campuses: [
    {
      id: 'galway',
      name: 'Galway',
      address: 'The Power House International Church, Unit 22 Marangonii House, Monivea Rd, Ballybrit, Galway, H91 958A',
      street: 'Unit 22 Marangonii House, Monivea Rd',
      times: { sunday: '10 AM', bibleStudy: '7 PM', prayer: '7 PM' },
      phone: '089 953 4714',
      email: 'contact.thepowerhouse@gmail.com',
      whatsappGroup: 'https://chat.whatsapp.com/GalwayGroup',
      coordinates: { lat: 53.295, lng: -8.997 },
    },
    {
      id: 'dublin',
      name: 'Dublin',
      address: "Holiday Inn Express 28-32 O'Connell Street Upper, Rotunda Dublin 1, D01T2X2",
      street: "Holiday Inn Express, O'Connell Street Upper",
      times: { sunday: '10 AM', bibleStudy: '8 PM', prayer: '8 PM' },
      phone: '089 252 7008',
      email: 'contact.thepowerhouse@gmail.com',
      whatsappGroup: 'https://chat.whatsapp.com/DublinGroup',
      coordinates: { lat: 53.353, lng: -6.263 },
    },
    {
      id: 'kildare',
      name: 'Kildare',
      address: "The Power House International, O'Cola House Lower Eyre Street, Newbridge, W12TK37",
      street: "O'Cola House, Lower Eyre Street, Newbridge",
      times: { sunday: '10 AM', bibleStudy: '7 PM', prayer: '7 PM' },
      phone: '089 953 5663',
      email: 'contact.thepowerhouse@gmail.com',
      whatsappGroup: 'https://chat.whatsapp.com/KildareGroup',
      coordinates: { lat: 53.179, lng: -6.8 },
    },
    {
      id: 'athlone',
      name: 'Athlone',
      address: 'Unit 22 Athlone Shopping Centre, Sean Costello Street, Athlone, Co. Westmeath, N37 V2Y2',
      street: 'Unit 22 Athlone Shopping Centre',
      times: { sunday: '10 AM', bibleStudy: '7 PM', prayer: '7 PM' },
      phone: '089 982 2556',
      email: 'contact.thepowerhouse@gmail.com',
      whatsappGroup: 'https://chat.whatsapp.com/AthloneGroup',
      coordinates: { lat: 53.4239, lng: -7.9407 },
    },
  ],
  locale: {
    language: 'en-IE',
    timeZone: 'Europe/Dublin',
    lawCountry: 'Ireland',
    phoneExample: '089 123 4567',
  },
  banners: [
    { title: 'New Here?', subtitle: 'Start your journey with us', to: '/new-here', image: '/banners/this.jpg', position: 'center 10%', fallback: 'bg-gradient-to-br from-blue-500 to-blue-700', feature: 'newHere' },
    { title: 'Serve', subtitle: 'Find your place on a team', to: '/serve', image: '/banners/next.jpg', position: 'center 5%', fallback: 'bg-gradient-to-br from-green-500 to-green-700', feature: 'teams' },
    { title: 'Building Campaign', subtitle: 'Build the house with us', to: '/building-campaign', image: '/banners/pastorsadi.jpg', position: '0% 20%', fallback: 'bg-gradient-to-br from-purple-500 to-purple-700', feature: 'buildingCampaign' },
    { title: 'Life Groups', subtitle: 'Grow in community', to: '/groups', image: '/banners/praise.jpg', position: 'center 8%', fallback: 'bg-gradient-to-br from-orange-500 to-orange-700', feature: 'teams' },
    { title: 'Give Online', subtitle: 'Tithes, offerings and seeds', to: '/give', image: '/banners/updatedpic.jpg', position: '20% 10%', fallback: 'bg-gradient-to-br from-red-500 to-red-700', cta: 'Give now', feature: 'giving' },
  ],
  choir: { branches: ['galway', 'kildare', 'athlone', 'dublin'], songwritingBranch: 'galway' },
  labels: {
    choirAcademy: 'Choir Academy',
    nationalChoir: 'TPH National Choir',
  },
  features: {
    watch: true,
    giving: true,
    prayerWall: true,
    events: true,
    newHere: true,
    locations: true,
    campusFellowships: true,
    buildingCampaign: true,
    serviceFeedback: true,
    socialMedia: true,
    teams: true,
    choir: true,
    choirNational: true,
    choirContributions: true,
    songwriting: true,
    ushering: true,
    evangelism: true,
    pastoral: true,
    management: true,
    teamFollowUp: true,
  },
};

/** The church this app is for (on Church Space, replaced before the app starts: lib/churchSpace) */
export const church: ChurchProfile = { ...THE_POWER_HOUSE };

/** What a church sets up for itself in "Create your church space" */
export interface SpaceProfile {
  city: string;
  colour: string;
  logo: string;
  icon192: string;
  icon512: string;
  features: Partial<Record<FeatureId, boolean>>;
  /** Only found by its exact link (the Test Church) */
  hidden: boolean;
}

/** A church as the database has it (church_directory) */
export interface ChurchRow {
  id: string;
  slug: string;
  name: string;
  join_mode: 'open' | 'approval';
  profile: Partial<SpaceProfile> | null;
  members?: number;
}

const ALL_OFF = Object.fromEntries(Object.keys(THE_POWER_HOUSE.features).map((id) => [id, false])) as Record<FeatureId, boolean>;

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w) && !/^(the|of|and)$/i.test(w))
    .map((w) => w[0].toUpperCase())
    .join('')
    .slice(0, 3) || name.slice(0, 2).toUpperCase();

/** A church's whole profile from its database row (The Power House's is the one above) */
export const profileFromRow = (row: ChurchRow): ChurchProfile => {
  if (row.id === THE_POWER_HOUSE.dbId) return { ...THE_POWER_HOUSE };
  const p = row.profile ?? {};
  const icon192 = p.icon192 || PLATFORM.icon192;
  const icon512 = p.icon512 || PLATFORM.icon512;
  return {
    id: row.slug,
    dbId: row.id,
    colour: p.colour || 'blue',
    city: p.city ?? '',
    name: row.name,
    fullName: row.name,
    initials: initialsOf(row.name),
    legalName: row.name,
    description: `${row.name}: Bible, prayer, messages and more`,
    website: '',
    appUrl: row.slug ? `${PLATFORM.url}/${row.slug}` : PLATFORM.url,
    contact: { email: '', infoEmail: '', privacyEmail: '', phone: '', address: p.city ?? '' },
    brand: {
      logo: p.logo || icon192,
      artwork: icon512,
      icon192,
      icon512,
      maskable512: icon512,
      themeColor: PLATFORM.themeColor,
      backgroundColor: '#ffffff',
    },
    youtube: { channelId: '', handle: '' },
    social: {},
    liveTimes: [],
    liveTimesLabel: '',
    giving: { bankName: '', accountName: '', iban: '', bic: '' },
    campuses: [],
    locale: { language: 'en', timeZone: 'UTC', lawCountry: '', phoneExample: '' },
    banners: [],
    choir: { branches: [], songwritingBranch: '' },
    labels: { choirAcademy: 'Choir Academy', nationalChoir: 'National Choir' },
    features: { ...ALL_OFF, ...p.features },
  };
};

/** The Church Space address before a church is chosen */
export const platformProfile = (): ChurchProfile => ({
  ...profileFromRow({ id: '', slug: '', name: PLATFORM.name, join_mode: 'open', profile: {} }),
  description: "Bible, prayer, messages and more, in your church's own app",
});

/** A campus's name from its id ("galway" → "Galway") */
export const campusName = (id: string) => church.campuses.find((c) => c.id === id)?.name ?? id;

/** Parts that only exist inside another (no Teams, no choir; no choir, no choir contributions) */
const PART_OF: Partial<Record<FeatureId, FeatureId>> = {
  choir: 'teams',
  choirNational: 'choir',
  choirContributions: 'choir',
  songwriting: 'choir',
  ushering: 'teams',
  evangelism: 'teams',
  pastoral: 'teams',
  management: 'teams',
  teamFollowUp: 'teams',
};

/** Whether this church uses a part of the app */
export const hasFeature = (id: FeatureId): boolean =>
  church.features[id] !== false && (!PART_OF[id] || hasFeature(PART_OF[id]!));
