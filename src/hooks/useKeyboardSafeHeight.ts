import { useEffect } from 'react';

/**
 * Keeps a full-screen view above the on-screen keyboard on iOS (which doesn't
 * resize the page): pads its bottom by the keyboard's height and stops iOS
 * pushing the whole page up. `active`: the view is on screen.
 */
export function useKeyboardSafeHeight(ref: React.RefObject<HTMLElement>, active = true) {
  useEffect(() => {
    const vv = window.visualViewport;
    const el = ref.current;
    if (!active || !vv || !el) return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!isIOS) return;
    const update = () => {
      const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      el.style.paddingBottom = keyboard > 80 ? `${keyboard}px` : '';
      if (keyboard > 80) window.scrollTo(0, 0);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      el.style.paddingBottom = '';
    };
  }, [ref, active]);
}
