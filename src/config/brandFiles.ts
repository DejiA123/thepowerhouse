/**
 * The church's name, colours and icons in the files outside the app itself:
 * the page title and link previews (index.html), and the install details
 * (manifest.json). Made from the church profile when the app is built, and
 * served the same way by the dev server (see vite.config.ts).
 */
import { church, hasFeature, PLATFORM } from './church';

/** Values for the %CHURCH_…% placeholders in index.html */
export const htmlValues: Record<string, string> = {
  NAME: church.name,
  FULL_NAME: church.fullName,
  DESCRIPTION: church.description,
  X_HANDLE: church.social.x?.handle ?? '',
  THEME_COLOR: church.brand.themeColor,
  DB_ID: church.dbId,
  SPACE_HOSTS: JSON.stringify(PLATFORM.hosts),
};

export const fillHtml = (html: string) => html.replace(/%CHURCH_([A-Z_]+)%/g, (all, key: string) => htmlValues[key] ?? all);

const shortcut = (name: string, shortName: string, description: string, url: string) => ({
  name,
  short_name: shortName,
  description,
  url,
  icons: [{ src: church.brand.icon192, sizes: '192x192', type: 'image/png' }],
});

/** manifest.json: how the app installs (name, icon, colours, long-press shortcuts) */
export const manifest = () => ({
  id: '/',
  name: church.name,
  short_name: church.name,
  description: church.description,
  start_url: '/',
  scope: '/',
  display: 'standalone',
  display_override: ['standalone', 'minimal-ui'],
  orientation: 'portrait',
  background_color: church.brand.backgroundColor,
  theme_color: church.brand.themeColor,
  lang: 'en',
  categories: ['lifestyle', 'education', 'social'],
  icons: [
    { src: church.brand.icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: church.brand.icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: church.brand.maskable512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  shortcuts: [
    shortcut('Messages', 'Messages', 'Open your group chats', '/group-chats'),
    shortcut('Bible', 'Bible', 'Open the Bible reader', '/bible'),
    shortcut('My Notes', 'Notes', 'Open your notes', '/bible-notes'),
    ...(hasFeature('prayerWall') ? [shortcut('Prayer Wall', 'Prayer', 'View prayer requests', '/prayer')] : []),
  ],
  prefer_related_applications: false,
  launch_handler: { client_mode: 'navigate-existing' },
});
