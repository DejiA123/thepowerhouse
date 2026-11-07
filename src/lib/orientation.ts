/**
 * Which way up the installed app may turn. The manifest says "any" (it said "portrait",
 * so Android tablets needed Settings → Labs to turn it, and then showed the phone layout
 * stretched). Tablets now turn freely and, being wider than 768 px in landscape, get the
 * computer layout (sidebar, wide pages). Phones stay upright as before: their screens are
 * too short for the wide layout, so the installed app locks itself to portrait. Android
 * allows that lock only in the installed (standalone) app; elsewhere it's refused, quietly.
 */
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: fullscreen)').matches;
/** A phone: the screen's shorter side is under 600 px (tablets start around 600) */
const isPhone = () => Math.min(window.screen?.width ?? 0, window.screen?.height ?? 0) < 600;

export function keepPhonesUpright() {
  try {
    const orientation = window.screen?.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
    if (!orientation?.lock || !isStandalone() || !isPhone()) return;
    orientation.lock('portrait').catch(() => undefined);
  } catch {
    /* not supported: the phone's own rotation setting decides */
  }
}

keepPhonesUpright();
