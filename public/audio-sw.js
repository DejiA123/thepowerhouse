/* Audio Bible chapters downloaded for offline listening (imported by the service worker).
 *
 * Downloaded chapters are played from the phone: always when there's no
 * connection, and otherwise whenever the chapter is saved. The player keeps its
 * normal audio address, so it starts instantly from a tap (iPhone only allows
 * sound straight after a tap) and seeking works: the saved file is handed back
 * in the byte ranges the player asks for.
 *
 * Anything not downloaded is left alone, so streaming works exactly as before.
 */
(() => {
  const AUDIO_CACHE = 'bible-audio-offline-v1';
  // Tells the app this offline player is installed (see offlineAudioService)
  caches.open('audio-sw-ready-v1').catch(() => undefined);

  let saved = new Set();
  const refresh = () =>
    caches
      .open(AUDIO_CACHE)
      .then((cache) => cache.keys())
      .then((keys) => {
        saved = new Set(keys.map((r) => r.url));
      })
      .catch(() => undefined);
  refresh();

  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'AUDIO_DOWNLOADS_CHANGED') refresh();
  });

  const isBibleAudio = (url) =>
    /\.(mp3|m4a|aac)$/i.test(url.pathname) && (/(^|\.)archive\.org$/i.test(url.hostname) || url.pathname.includes('/audio-bible/'));

  async function fromPhone(request) {
    const cache = await caches.open(AUDIO_CACHE);
    const hit = await cache.match(request.url);
    if (!hit) return fetch(request);

    const type = hit.headers.get('Content-Type') || 'audio/mpeg';
    const range = request.headers.get('range');
    const blob = await hit.blob();
    const size = blob.size;
    if (!range) {
      return new Response(blob, { status: 200, headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' } });
    }
    const m = /bytes=(\d*)-(\d*)/i.exec(range);
    let start = 0;
    let end = size - 1;
    if (m && m[1]) {
      start = Number(m[1]);
      if (m[2]) end = Math.min(Number(m[2]), size - 1);
    } else if (m && m[2]) {
      // "bytes=-500": the last 500 bytes
      start = Math.max(0, size - Number(m[2]));
    }
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    return new Response(blob.slice(start, end + 1, type), {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Type': type,
        'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
      },
    });
  }

  self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    let url;
    try {
      url = new URL(request.url);
    } catch {
      return;
    }
    if (!isBibleAudio(url)) return;
    const offline = self.navigator && self.navigator.onLine === false;
    if (!offline && !saved.has(request.url)) return;
    event.respondWith(fromPhone(request).catch(() => fetch(request)));
  });
})();
