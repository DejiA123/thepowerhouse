import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { trackPageBg } from "@/lib/pageBg";
import { ChevronLeft, CircleHelp, Search } from "lucide-react";
import { openSearch } from "@/lib/appEvents";
import { SECTIONS, sectionForPath } from "@/data/appDirectory";
import { church } from '@/config/church';

/** Pages without a Back button of their own: the top bar gives them one */
const NEEDS_BACK = ["/give", "/news", "/prayer", "/services", "/social", "/groups/ushering", "/groups/evangelism"];

/**
 * Phones: the church's name (or a Back button inside a page), and two clearly
 * labelled buttons that are always there: Search and Help.
 */
const Header = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // Home has its own big search box
  const showSearch = pathname !== "/";
  const showBack = NEEDS_BACK.includes(pathname);

  // Back to where you came from; opened directly, back to the page's tab
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(SECTIONS.find((s) => s.id === sectionForPath(pathname))?.path ?? "/");
  };

  // The bar is the page's own colour, solid (lib/pageBg.ts)
  useEffect(() => trackPageBg(), []);

  // Like YouVersion: no fade at all while the page is at its top (it washed out coloured
  // banners right under the bar, e.g. a choir's); a soft edge appears only once the page
  // scrolls under the bar, growing over the first 24 px of scrolling
  const fadeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = (target?: EventTarget | null) => {
      frame = 0;
      const el = target instanceof HTMLElement ? target : null;
      // The page's own scroll (window, or a full-page scroller); small scrollers inside a page don't count
      const y = el && el.clientHeight > window.innerHeight * 0.6 ? el.scrollTop : window.scrollY;
      if (fadeRef.current) fadeRef.current.style.opacity = String(Math.min(1, Math.max(0, y / 24)));
    };
    const onScroll = (e: Event) => {
      const target = e.target === document ? null : e.target;
      if (target instanceof HTMLElement && target.clientHeight <= window.innerHeight * 0.6) return;
      if (!frame) frame = requestAnimationFrame(() => update(target));
    };
    update();
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  // A new page starts at its top: no fade
  useEffect(() => {
    if (fadeRef.current) fadeRef.current.style.opacity = String(Math.min(1, window.scrollY / 24));
  }, [pathname]);

  return (
    // Like YouVersion: a solid bar in the page's colour (no see-through glass, no line), and
    // once the page scrolls under it, a soft edge just below it
    <header className="top-bar fixed top-0 w-full z-40">
      <div className="px-4 pb-2 pt-[calc(0.5rem+max(env(safe-area-inset-top),var(--sat-fallback,0px)))]">
        <div className="flex h-12 sm:h-16 items-center justify-between gap-2">
          {showBack ? (
            <button
              onClick={goBack}
              className="flex h-11 items-center gap-0.5 rounded-full border border-border bg-card pl-2 pr-4 text-[16px] font-semibold text-primary shadow-sm tap-feedback"
            >
              <ChevronLeft className="h-6 w-6" />
              Back
            </button>
          ) : (
            <Link to="/" className="flex min-w-0 items-center gap-2 tap-feedback">
              <img src={church.brand.logo} alt="" className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12" />
              <span className="truncate font-outfit text-[18px] font-semibold text-foreground sm:text-xl">{church.name}</span>
            </Link>
          )}

          <div className="flex shrink-0 items-center gap-2">
            {showSearch && (
              <button
                onClick={() => openSearch()}
                className="flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[14.5px] font-semibold text-foreground shadow-sm tap-feedback"
                aria-label="Search"
              >
                <Search className="h-5 w-5 text-primary" />
                <span className="hidden min-[440px]:inline">Search</span>
              </button>
            )}
            <Link
              to="/help"
              data-tour="help"
              className="flex h-10 items-center gap-1.5 rounded-full border border-border bg-card pl-2.5 pr-3.5 text-[14.5px] font-semibold text-foreground shadow-sm tap-feedback"
            >
              <CircleHelp className="h-5 w-5 text-primary" />
              Help
            </Link>
          </div>
        </div>
      </div>
      <div ref={fadeRef} aria-hidden className="top-fade pointer-events-none absolute inset-x-0 top-full h-5" style={{ opacity: 0 }} />
    </header>
  );
};

export default Header;
