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
      className="glass border-t-0 w-full shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-1 fixed bottom-0 left-0 right-0 z-50 rounded-t-[2rem]"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.preventDefault()}
      draggable="false"
    >
      <div className="flex justify-around py-2 touch-none select-none">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center py-3 px-4 min-w-0 flex-1 touch-none"
              draggable="false"
            >
              <Icon
                className={`w-6 h-6 mb-1 ${isActive ? "text-primary" : "text-muted-foreground"
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
