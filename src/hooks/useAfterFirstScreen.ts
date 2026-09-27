import { useEffect, useState } from 'react';

/**
 * False at first, then true once the first screen is showing. A page can draw
 * what's on screen straight away and fill in what's further down just after,
 * so the part further down doesn't hold up opening the app.
 */
export function useAfterFirstScreen() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // After the next frame is painted
    const go = () => {
      frame = requestAnimationFrame(() => {
        timer = setTimeout(() => setReady(true), 0);
      });
    };

    // Opening the app: wait until the splash screen starts to go (index.html)
    const splash = document.getElementById('splash');
    const opening = !!splash && !splash.classList.contains('splash-hide');
    if (opening) window.addEventListener('app-ready', go, { once: true });
    else go();
    const fallback = setTimeout(() => setReady(true), 3000);

    return () => {
      window.removeEventListener('app-ready', go);
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      clearTimeout(fallback);
    };
  }, []);

  return ready;
}
