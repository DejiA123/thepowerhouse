import { useEffect, useState } from 'react';

/**
 * Where a YouTube player (an embed with `enablejsapi=1`) is up to, in seconds, or null
 * until it says. Uses the player's own messages: after a "listening" hello it sends
 * `infoDelivery` with `currentTime` while it plays, and on every seek. Updates at most
 * once a second (or at once on a seek), for the live chat replay.
 */
export function useYouTubeTime(frame: HTMLIFrameElement | null, enabled: boolean): number | null {
  const [time, setTime] = useState<number | null>(null);

  useEffect(() => {
    setTime(null);
    if (!frame || !enabled) return;
    let heard = false;
    const hello = () => frame.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'live-chat-replay', channel: 'widget' }), '*');
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.contentWindow || !/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return;
      let data: { info?: { currentTime?: unknown } } | null = null;
      try {
        data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      const now = data?.info?.currentTime;
      if (typeof now !== 'number' || !Number.isFinite(now)) return;
      heard = true;
      setTime((prev) => (prev === null || Math.abs(prev - now) >= 1 ? now : prev));
    };
    window.addEventListener('message', onMessage);
    frame.addEventListener('load', hello);
    hello();
    // Say hello until the player answers (it may still be loading)
    let tries = 0;
    const timer = window.setInterval(() => {
      if (heard || ++tries > 30) window.clearInterval(timer);
      else hello();
    }, 1000);
    return () => {
      window.removeEventListener('message', onMessage);
      frame.removeEventListener('load', hello);
      window.clearInterval(timer);
    };
  }, [frame, enabled]);

  return time;
}
