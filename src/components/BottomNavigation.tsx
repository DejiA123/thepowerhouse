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
      className="glass w-full shrink-0 pt-0.5 pb-0 z-50 rounded-none border-t border-gray-200/60 dark:border-white/10"
      style={{
        paddingBottom: '0px',
        marginBottom: '-6px', // Force it slightly below the safe area
        boxShadow: '0 -1px 3px rgba(0,0,0,0.08)'
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.preventDefault()}
      draggable="false"
    >
      <div className="w-full flex justify-around touch-none select-none items-center h-12">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center justify-center p-0 min-w-0 flex-1 touch-none group h-full"
              draggable="false"
              title={item.name}
            >
              <Icon
                className={`w-6 h-6 transition-colors duration-200 ${isActive
                  ? "text-primary shadow-sm"
                  : "text-muted-foreground dark:text-gray-400 group-hover:text-primary"
                  }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
