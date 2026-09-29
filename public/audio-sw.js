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

  // Which chapters are saved. Listed a few seconds after the worker starts,
  // not straight away: with the whole audio Bible saved, listing it while the
  // app was opening slowed the opening (the app loads from the same storage).
  let saved = null;
  let listing = null;
  let relist;
  const listSaved = () => {
    if (!listing) {
      listing = caches
        .open(AUDIO_CACHE)
        .then((cache) => cache.keys())
        .then((keys) => {
          saved = new Set(keys.map((r) => r.url));
        })
        .catch(() => undefined)
        .finally(() => {
          listing = null;
        });
    }
    return listing;
  };
  setTimeout(listSaved, 5000);

  self.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.type !== 'AUDIO_DOWNLOADS_CHANGED') return;
    // One chapter at a time while downloading (listing everything after each
    // saved chapter made a whole-Bible download slower and slower)
    if (saved && data.added) saved.add(data.added);
    else if (saved && data.removed) saved.delete(data.removed);
    else {
      clearTimeout(relist);
      relist = setTimeout(listSaved, 1000);
    }
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
    // Not listed yet (audio straight after opening): streams as before, and the list follows
    if (!saved) listSaved();
    if (!offline && !(saved && saved.has(request.url))) return;
    event.respondWith(fromPhone(request).catch(() => fetch(request)));
  });
})();
