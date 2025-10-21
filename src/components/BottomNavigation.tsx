
import { Link, useLocation } from "react-router-dom";
import { Home, Book, Calendar, Heart, Info } from "lucide-react";
import { useEffect, useState } from "react";

const BottomNavigation = () => {
  const location = useLocation();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Detect keyboard visibility on iOS devices
  useEffect(() => {
    // Function to detect keyboard visibility
    const detectKeyboard = () => {
      // Check if we're in a PWA on iOS
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      
      if (isIOS) {
        // Use visual viewport API to detect keyboard
        const visualViewport = window.visualViewport;
        
        if (visualViewport) {
          const handleResize = () => {
            // If the visual viewport height is significantly less than the window height,
            // the keyboard is likely visible
            const windowHeight = window.innerHeight;
            const viewportHeight = visualViewport.height;
            setIsKeyboardVisible(windowHeight - viewportHeight > 150);
          };
          
          visualViewport.addEventListener('resize', handleResize);
          return () => visualViewport.removeEventListener('resize', handleResize);
        }
      }
    };
    
    detectKeyboard();
  }, []);

  const navigationItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "News", path: "/news", icon: Calendar },
    { name: "Bible", path: "/bible", icon: Book },
    { name: "Give", path: "/give", icon: Heart },
    { name: "Resources", path: "/resources", icon: Info },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-card backdrop-blur-md border-t border-border/30 z-[102] h-[72px] will-change-transform ${isKeyboardVisible ? 'hidden' : ''}`}>
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
