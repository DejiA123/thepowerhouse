import { Link, useLocation } from "react-router-dom";
import { SECTIONS, sectionForPath } from "@/data/appDirectory";

/**
 * The five places everything lives (phones): Home, Bible, Church, Teams, Me.
 * The tab for whatever you're looking at stays lit, however deep you are.
 */
const BottomNavigation = () => {
  const location = useLocation();
  const active = sectionForPath(location.pathname);

  // Robust iPhone check
  const isIPhone = typeof window !== 'undefined' && /iPhone/.test(navigator.userAgent);

  return (
    <nav
      id="nav-v12-force-lift"
      aria-label="Main"
      className="bottom-nav-bar w-full fixed bottom-0 left-0 right-0 z-[100] border-t border-gray-200/60 dark:border-white/10 bg-white/95 dark:bg-black/95 backdrop-blur-xl"
      style={{
        boxShadow: '0 -1px 6px rgba(0,0,0,0.06)',
        paddingBottom: isIPhone ? '5px' : '10px'
      }}
      onTouchStart={(e) => e.stopPropagation()}
      draggable="false"
    >
      <div data-tour="tabs" className="w-full h-[62px] flex justify-around items-start pt-1.5 relative">
        {SECTIONS.map((item) => {
          const isActive = item.id === active;
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              to={item.path}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-col items-center justify-start py-0 px-2 min-w-0 flex-1 h-full relative z-10"
              draggable="false"
            >
              {/* Plain CSS here: this bar is on every screen, so it mustn't pull the
                  animation library into the app's start-up code */}
              <div className="relative flex flex-col items-center gap-1 transition-transform duration-150 active:scale-[0.85]">
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200 ${isActive ? "bg-primary/10 dark:bg-primary/25" : ""}`}
                >
                  <Icon
                    className={`w-6 h-6 transition-colors duration-200 ${isActive ? "text-primary" : "text-muted-foreground dark:text-gray-400"}`}
                    strokeWidth={isActive ? 2.3 : 2}
                  />
                </span>
                <span
                  className={`text-[12px] leading-none transition-all duration-200 ${isActive ? "text-primary font-bold" : "text-muted-foreground font-semibold dark:text-gray-400"}`}
                  draggable="false"
                >
                  {item.title}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
