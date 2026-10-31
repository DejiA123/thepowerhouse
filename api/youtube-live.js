// Is the church live on YouTube right now? The app asks the youtube-live backend
// function first (it can use the YouTube API); this is the backup while that
// isn't deployed. ?channel=UC… picks the church's channel (Church Space).
//
// Reads the channel's public "/live" page, which points at the live broadcast
// while there is one (no API key or quota needed). Vercel keeps each answer for
// a minute, so however many people have the app open, YouTube is asked once a minute.
const CHANNEL_ID = 'UC35azCG6jqVkR2G8aH91v4A';

const decode = (text) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

export async function liveStatus(channelId = CHANNEL_ID) {
  const res = await fetch(`https://www.youtube.com/channel/${channelId}/live`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Accept-Language': 'en-GB,en;q=0.9',
      // Skips the cookie-consent page YouTube shows in Europe
      Cookie: 'SOCS=CAI',
    },
  });
  const html = await res.text();
  const videoId =
    html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)?.[1] ??
    html.match(/"currentVideoEndpoint":\{[^}]*?"videoId":"([\w-]{11})"/)?.[1] ??
    null;
  // A broadcast that's on now ("isLive" stays false on recordings of past streams)
  const live = !!videoId && /"(isLive|isLiveNow)":\s*true/.test(html);
  const upcoming = !!videoId && !live && /"isUpcoming":\s*true/.test(html);
  const title = decode(html.match(/<meta name="title" content="([^"]*)"/)?.[1] ?? '');
  return { live, upcoming, videoId: live || upcoming ? videoId : null, title: live || upcoming ? title : null };
}

export default async function handler(req, res) {
  try {
    const asked = String(req.query?.channel ?? '');
    const status = await liveStatus(/^UC[\w-]{22}$/.test(asked) ? asked : CHANNEL_ID);
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    res.status(200).json(status);
  } catch (error) {
    res.setHeader('Cache-Control', 'public, s-maxage=30');
    res.status(200).json({ live: false, upcoming: false, videoId: null, title: null, error: String(error?.message || error) });
  }
}
