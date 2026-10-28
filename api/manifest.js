// Install details (web app manifest) on the Church Space address: a church's own name and icon,
// so its app on a phone's Home Screen is that church's, not "Church Space".
// /api/manifest?church=gracechapel → Grace Chapel's; /api/manifest → Church Space's (Find your church).
// The Power House's own address uses the manifest.json made when the app is built.
const SUPABASE_URL = 'https://swjzhzmhqyvwfwevijja.supabase.co';
// The public (anon) key the app itself uses; it can only read what visitors can
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3anpoem1ocXl2d2Z3ZXZpamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMjE4NDcsImV4cCI6MjA2NDc5Nzg0N30.M0WyKsQm_nqGCEUNKPpSOM8Au4BONv5VGlsI0YS1wBQ';
const POWER_HOUSE = '7a1c0de5-0000-4000-8000-000000000001';

const findChurch = async (slug) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/church_directory`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ find_slug: slug }),
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] ?? null;
};

const icons = (icon192, icon512) => [
  { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

export default async function handler(req, res) {
  const slug = String(req.query.church ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  const row = slug ? await findChurch(slug).catch(() => null) : null;
  const p = row?.profile ?? {};
  const powerHouse = row?.id === POWER_HOUSE;
  const name = row ? (powerHouse ? 'The Power House' : row.name) : 'Church Space';
  const manifest = {
    // A different id per church: each installs as its own app
    id: row ? `/${row.slug}` : '/',
    name,
    short_name: name.length > 14 && row && !powerHouse ? name.split(' ').slice(0, 2).join(' ') : name,
    description: row ? `${name}: Bible, prayer, messages and more` : "Bible, prayer, messages and more, in your church's own app",
    start_url: row ? `/${row.slug}?open=1` : '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    lang: 'en',
    categories: ['lifestyle', 'education', 'social'],
    icons: powerHouse
      ? [...icons('/icons/icon-192.png', '/icons/icon-512.png').slice(0, 2), { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }]
      : icons(p.icon192 || '/space/icon-192.png', p.icon512 || '/space/icon-512.png'),
    prefer_related_applications: false,
    launch_handler: { client_mode: 'navigate-existing' },
  };
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.status(200).send(JSON.stringify(manifest));
}
