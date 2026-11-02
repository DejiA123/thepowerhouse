// A link's preview for chats (title, description, picture, site), like WhatsApp:
// the sender's phone asks here while they type, then sends the preview inside
// the (end-to-end encrypted) message. Nothing about the chat is sent here,
// only the link. Vercel keeps each answer for a day.
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_BYTES = 512 * 1024;
const UA = 'Mozilla/5.0 (compatible; ChurchSpaceLinkPreview/1.0; +https://churchspaceapp.vercel.app)';

const decode = (text = '') =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Never fetch the server's own network (localhost, private ranges, cloud metadata) */
function privateAddress(ip) {
  if (isIP(ip) === 6) return /^(::1|fc|fd|fe80|::ffff:(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.))/i.test(ip) || ip === '::';
  return /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(ip);
}

async function safeUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(url.hostname)) return null;
  const addresses = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true }).catch(() => []);
  if (!addresses.length || addresses.some((a) => privateAddress(a.address))) return null;
  return url;
}

const meta = (html, names) => {
  for (const name of names) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, 'i');
    const tag = html.match(re)?.[0];
    const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
    if (content) return decode(content);
  }
  return '';
};

async function readSome(res) {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
    // The preview tags are in <head>: stop once it's over
    if (Buffer.concat(chunks).toString('utf8').includes('</head>')) break;
  }
  reader.cancel().catch(() => undefined);
  return Buffer.concat(chunks).toString('utf8');
}

async function preview(url) {
  // YouTube: its own description service (the page is behind a consent screen in Europe)
  if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/i.test(url.hostname)) {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.href)}`, { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const o = await r.json();
      return { title: o.title, description: o.author_name, image: o.thumbnail_url, site: 'YouTube' };
    }
  }
  let current = url;
  let res;
  for (let hops = 0; hops < 4; hops++) {
    res = await fetch(current, { redirect: 'manual', headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(6000) });
    const next = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
    if (!next) break;
    const checked = await safeUrl(new URL(next, current).href);
    if (!checked) return null;
    current = checked;
  }
  if (!res?.ok || !/html/i.test(res.headers.get('content-type') || '')) return null;
  const html = await readSome(res);
  const title = meta(html, ['og:title', 'twitter:title']) || decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]);
  if (!title) return null;
  let image = meta(html, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']);
  try {
    image = image ? new URL(image, current).href : '';
  } catch {
    image = '';
  }
  return {
    title: title.slice(0, 200),
    description: meta(html, ['og:description', 'twitter:description', 'description']).slice(0, 300),
    image: image.startsWith('https://') ? image : undefined,
    site: meta(html, ['og:site_name']) || current.hostname.replace(/^www\./, ''),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const url = await safeUrl(String(req.query?.url ?? ''));
    if (!url) {
      res.status(400).json({ error: 'Not a link that can be previewed' });
      return;
    }
    const data = await preview(url);
    res.setHeader('Cache-Control', data ? 'public, s-maxage=86400, stale-while-revalidate=604800' : 'public, s-maxage=3600');
    res.status(data ? 200 : 404).json(data ?? { error: 'No preview' });
  } catch (error) {
    res.setHeader('Cache-Control', 'public, s-maxage=600');
    res.status(404).json({ error: String(error?.message || error) });
  }
}
