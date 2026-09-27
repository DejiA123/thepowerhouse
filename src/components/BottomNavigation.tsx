import { Link, useLocation } from "react-router-dom";
import { Home, Book, Calendar, Heart, Info } from "lucide-react";

const BottomNavigation = () => {
  const location = useLocation();

  const navigationItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "News", path: "/news", icon: Calendar },
    { name: "Bible", path: "/bible", icon: Book },
    { name: "Give", path: "/give", icon: Heart },
    { name: "Resources", path: "/resources", icon: Info },
  ];

  // Robust iPhone check
  const isIPhone = typeof window !== 'undefined' && /iPhone/.test(navigator.userAgent);

  return (
    <nav
      id="nav-v12-force-lift"
      className="bottom-nav-bar w-full fixed bottom-0 left-0 right-0 z-[100] border-t border-gray-200/60 dark:border-white/10 bg-white/95 dark:bg-black/95 backdrop-blur-xl"
      style={{
        boxShadow: '0 -1px 6px rgba(0,0,0,0.06)',
        paddingBottom: isIPhone ? '5px' : '10px'
      }}
      onTouchStart={(e) => e.stopPropagation()}
      draggable="false"
    >
      <div
        className="w-full h-[60px] flex justify-around items-start pt-1.5 relative"
      >
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-start py-0 px-4 min-w-0 flex-1 h-full relative z-10"
              draggable="false"
            >
              {/* Plain CSS here: this bar is on every screen, so it mustn't pull the
                  animation library into the app's start-up code */}
              <div className="relative flex flex-col items-center transition-transform duration-150 active:scale-[0.85]">
                {/* Active pill behind the icon */}
                {isActive && (
                  <div className="absolute -inset-x-2 -inset-y-1 rounded-2xl bg-primary/10 animate-in fade-in zoom-in-90 duration-200 dark:bg-primary/20" />
                )}
                <Icon
                  className={`w-[22px] h-[22px] transition-colors duration-200 mb-1 relative z-10 ${isActive
                    ? "text-primary"
                    : "text-muted-foreground dark:text-gray-400"
                    }`}
                />
                <span
                  className={`text-[11px] leading-none transition-all duration-200 relative z-10 ${isActive
                    ? "text-primary font-bold"
                    : "text-muted-foreground dark:text-gray-400"
                    }`}
                  draggable="false"
                >
                  {item.name}
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
