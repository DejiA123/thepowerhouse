/**
 * The page's real background colour as `--page-bg` ("r g b") on <html>, for the layers that
 * must match it exactly: the solid top bar with its fade, and the fade under the bottom bar
 * (like YouVersion's). Light and the colour themes paint the body differently (`!important`
 * rules, inline styles), so it's read from the body's computed colour, again whenever html
 * or body change class or style, and 0.4 s later (the body's colour fades over 0.3 s).
 */
let started = false;

export function trackPageBg() {
  if (started || typeof document === 'undefined' || !document.body) return;
  started = true;
  const root = document.documentElement;
  let last = '';
  const apply = () => {
    const m = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g);
    if (!m || (m.length > 3 && Number(m[3]) === 0)) return; // transparent: keep the last one
    const value = `${m[0]} ${m[1]} ${m[2]}`;
    if (value === last) return;
    last = value;
    root.style.setProperty('--page-bg', value);
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const soon = () => {
    apply();
    clearTimeout(timer);
    timer = setTimeout(apply, 400);
  };
  soon();
  // Not html's style: setting --page-bg there would wake this again
  const watch = new MutationObserver(soon);
  watch.observe(root, { attributes: true, attributeFilter: ['class'] });
  watch.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
}
