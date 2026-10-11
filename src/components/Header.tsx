import { Link, useLocation } from "react-router-dom";
import { CircleHelp, Search } from "lucide-react";
import { openSearch } from "@/lib/appEvents";

/**
 * Phones: the church's name, and two clearly labelled buttons that are always
 * there: Search (find anything) and Help. Everything else is in the bottom bar.
 */
const Header = () => {
  const { pathname } = useLocation();
  // Home has its own big search box
  const showSearch = pathname !== "/";

  return (
    <header className="fixed top-0 w-full z-40 bg-background/85 backdrop-blur-xl border-b border-border/50 shadow-sm">
      <div className="px-4 pb-2 pt-[calc(0.5rem+max(env(safe-area-inset-top),var(--sat-fallback,0px)))]">
        <div className="flex h-12 sm:h-16 items-center justify-between gap-2">
          <Link to="/" className="flex min-w-0 items-center gap-2 tap-feedback">
            <img src="/brand/logo-144.png" alt="" className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12" />
            <span className="truncate font-outfit text-[18px] font-semibold text-foreground sm:text-xl">The Power House</span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            {showSearch && (
              <button
                onClick={() => openSearch()}
                className="flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[14.5px] font-semibold text-foreground shadow-sm tap-feedback"
                aria-label="Search"
              >
                <Search className="h-5 w-5 text-primary" />
                <span className="hidden min-[380px]:inline">Search</span>
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
