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

  // Detect if the app is running as a standalone PWA and is on iOS
  const isPWAOnIOS = () => {
    return ((window.navigator as any).standalone || (window.matchMedia('(display-mode: standalone)').matches)) && /iPad|iPhone|iPod/.test(navigator.userAgent);
  };

  const navStyle = () => ({
    marginTop: isPWAOnIOS() ? '-0.5rem' : undefined, // Adjust this value as needed
  });

  return (
    <nav 
      style={navStyle()} 
      className="bg-card backdrop-blur-md border-t border-border/30 h-[72px] w-full shrink-0 pb-[env(safe-area-inset-bottom)]"
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
                className={`w-6 h-6 mb-1 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`} 
                draggable="false"
              />
              <span 
                className={`text-xs ${
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
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
