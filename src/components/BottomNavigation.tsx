import { Link, useLocation } from "react-router-dom";
import { Home, Book, Calendar, Heart, Info } from "lucide-react";
import { useEffect, useState } from "react";

const BottomNavigation = () => {
  const location = useLocation();
  const [safeAreaBottom, setSafeAreaBottom] = useState('0px');

  useEffect(() => {
    // Force recalculation of safe area on mount and route changes
    const updateSafeArea = () => {
      const computedValue = getComputedStyle(document.documentElement)
        .getPropertyValue('--safe-area-inset-bottom') || 
        getComputedStyle(document.documentElement)
        .getPropertyValue('env(safe-area-inset-bottom)') || '0px';
      
      setSafeAreaBottom(computedValue);
      
      // Force a reflow to ensure layout recalculation
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    };

    updateSafeArea();
    
    // Update on orientation change and resize
    window.addEventListener('orientationchange', updateSafeArea);
    window.addEventListener('resize', updateSafeArea);
    
    // Delayed update for PWA viewport settling
    const timer = setTimeout(updateSafeArea, 100);
    
    return () => {
      window.removeEventListener('orientationchange', updateSafeArea);
      window.removeEventListener('resize', updateSafeArea);
      clearTimeout(timer);
    };
  }, [location.pathname]);

  const navigationItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "News", path: "/news", icon: Calendar },
    { name: "Bible", path: "/bible", icon: Book },
    { name: "Give", path: "/give", icon: Heart },
    { name: "Resources", path: "/resources", icon: Info },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-card backdrop-blur-md border-t border-border/30 z-[102] will-change-transform"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: 'calc(72px + env(safe-area-inset-bottom))'
      }}
    >
      <div className="flex justify-around py-2">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center py-3 px-4 min-w-0 flex-1"
            >
              <Icon 
                className={`w-6 h-6 mb-1 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`} 
              />
              <span 
                className={`text-xs ${
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                }`}
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
