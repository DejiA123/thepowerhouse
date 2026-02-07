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

  // Target iPhone 13/12/14 standard size (390px width)
  // iPhone 12 Pro Max is 428px, so this won't affect it.
  const isIPhoneStandard = typeof window !== 'undefined' && window.screen.width === 390;

  // Detect if running in standalone PWA mode
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );

  return (
    <nav
      id="bottom-nav-bar"
      data-version="v6-pwa-safe-area"
      className="bottom-nav-bar w-full fixed bottom-0 left-0 right-0 z-[100] border-t border-gray-200/60 dark:border-white/10 bg-white dark:bg-black backdrop-blur-lg"
      style={{
        boxShadow: '0 -1px 3px rgba(0,0,0,0.08)',
        // Extra lift for PWA mode (standalone) on top of safe area
        paddingBottom: isStandalone
          ? 'calc(env(safe-area-inset-bottom) + 40px)'
          : isIPhoneStandard
            ? 'max(env(safe-area-inset-bottom), 45px)'
            : 'max(env(safe-area-inset-bottom), 35px)'
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.preventDefault()}
      draggable="false"
    >
      <div
        className="w-full h-[60px] flex justify-around touch-none select-none items-start pt-2"
      >
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-start py-0 px-4 min-w-0 flex-1 touch-none group h-full"
              draggable="false"
            >
              <Icon
                className={`w-[22px] h-[22px] transition-colors duration-200 mb-1 ${isActive
                  ? "text-primary shadow-sm"
                  : "text-muted-foreground dark:text-gray-400 group-hover:text-primary"
                  }`}
              />
              <span
                className={`text-[12px] leading-none transition-colors duration-200 ${isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground dark:text-gray-400 group-hover:text-primary"
                  }`}
                draggable="false"
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav >
  );
};

export default BottomNavigation;
