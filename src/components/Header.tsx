import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, CircleHelp, Search } from "lucide-react";
import { openSearch } from "@/lib/appEvents";
import { SECTIONS, sectionForPath } from "@/data/appDirectory";

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

  return (
    <header className="fixed top-0 w-full z-40 bg-background/85 backdrop-blur-xl border-b border-border/50 shadow-sm">
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
              <img src="/brand/logo-144.png" alt="" className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12" />
              <span className="truncate font-outfit text-[18px] font-semibold text-foreground sm:text-xl">The Power House</span>
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
    </header>
  );
};

export default Header;
