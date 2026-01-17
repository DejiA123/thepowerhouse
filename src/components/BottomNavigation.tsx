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

  return (
    <nav
      className="w-full fixed bottom-0 left-0 right-0 z-50 rounded-none border-t border-gray-200/60 dark:border-white/10 bg-white dark:bg-black backdrop-blur-lg"
      style={{
        boxShadow: '0 -1px 3px rgba(0,0,0,0.08)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) - 8px)'
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.preventDefault()}
      draggable="false"
    >
      <div
        className="w-full flex justify-around touch-none select-none items-center pt-1 pb-1"
      >
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center py-0.5 px-4 min-w-0 flex-1 touch-none group"
              draggable="false"
            >
              <Icon
                className={`w-7 h-7 transition-colors duration-200 ${isActive
                  ? "text-primary shadow-sm"
                  : "text-muted-foreground dark:text-gray-400 group-hover:text-primary"
                  }`}
              />
              <span
                className={`text-[11px] mt-0.5 transition-colors duration-200 ${isActive
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
    </nav>
  );
};

export default BottomNavigation;
