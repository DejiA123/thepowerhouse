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
      className="glass border-t-0 w-full shrink-0 pt-2 pb-[calc(env(safe-area-inset-bottom)*0.7+8px)] z-50 rounded-none border-t border-white/10"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.preventDefault()}
      draggable="false"
    >
      <div className="w-full pt-1 flex justify-around touch-none select-none">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center py-0.5 px-4 min-w-0 flex-1 touch-none"
              draggable="false"
            >
              <Icon
                className={`w-6 h-6 ${isActive ? "text-primary" : "text-muted-foreground"
                  }`}
              />
              <span
                className={`text-xs ${isActive ? "text-primary font-medium" : "text-muted-foreground"
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
