import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import BottomNavigation from "./BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const showChrome = location.pathname !== "/intro";
  const { user } = useAuth();

  // Initialize theme on app load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    const savedColorTheme = localStorage.getItem('colorTheme') || 'default';
    const root = document.documentElement;
    const body = document.body;
    
    const applyTheme = (theme: string, colorTheme: string) => {
      // Remove existing theme classes from both html and body
      root.classList.remove('light', 'dark', 'theme-blue', 'theme-green', 'theme-purple', 'theme-yellow', 'theme-red', 'theme-orange', 'theme-custom');
      body.classList.remove('light', 'dark', 'theme-blue', 'theme-green', 'theme-purple', 'theme-yellow', 'theme-red', 'theme-orange', 'theme-custom');
      
      // Apply custom theme colors if selected
      if (colorTheme === 'custom') {
        applyCustomTheme();
      } else if (colorTheme !== 'default') {
        const colorThemeClass = `theme-${colorTheme}`;
        root.classList.add(colorThemeClass);
        body.classList.add(colorThemeClass);
      }
      
      // Apply light/dark theme
      if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const themeClass = isDark ? 'dark' : 'light';
        root.classList.add(themeClass);
        body.classList.add(themeClass);
      } else {
        root.classList.add(theme);
        body.classList.add(theme);
      }
      
      // Apply background color based on selected theme
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      // Get the computed styles for the current theme combination
      const computedStyles = getComputedStyle(root);
      const backgroundColor = computedStyles.getPropertyValue('--background');
      const foregroundColor = computedStyles.getPropertyValue('--foreground');
      
      if (backgroundColor && foregroundColor) {
        body.style.backgroundColor = `hsl(${backgroundColor})`;
        body.style.color = `hsl(${foregroundColor})`;
        root.style.backgroundColor = `hsl(${backgroundColor})`;
        root.style.color = `hsl(${foregroundColor})`;
      }
      
      // Dynamically update iOS status bar style for PWA
      try {
        const statusBarMeta = document.querySelector(
          'meta[name="apple-mobile-web-app-status-bar-style"]'
        ) as HTMLMetaElement | null;
        if (statusBarMeta) {
          statusBarMeta.setAttribute('content', isDark ? 'black' : 'default');
        }
        
        // Also update theme-color meta tag for Android
        const themeColorMeta = document.querySelector(
          'meta[name="theme-color"]'
        ) as HTMLMetaElement | null;
        if (themeColorMeta) {
          themeColorMeta.setAttribute('content', `hsl(${backgroundColor})`);
        }
      } catch (e) {
        console.warn('Failed to update status bar meta tags:', e);
      }
      
      console.log('🎨 Layout: Theme applied:', theme, 'Color:', colorTheme, 'Body classes:', body.className);
    };

    const applyCustomTheme = () => {
      const customPrimaryColor = localStorage.getItem('customPrimaryColor') || '#3b82f6';
      const customBackgroundColor = localStorage.getItem('customBackgroundColor') || '#ffffff';
      
      // Convert hex to HSL for CSS variables
      const primaryHSL = hexToHSL(customPrimaryColor);
      const backgroundHSL = hexToHSL(customBackgroundColor);
      
      // Apply custom CSS variables
      root.style.setProperty('--primary', primaryHSL);
      root.style.setProperty('--background', backgroundHSL);
      root.style.setProperty('--card', backgroundHSL);
      root.style.setProperty('--popover', backgroundHSL);
      
      // Calculate contrasting foreground color
      const isDarkBackground = isColorDark(customBackgroundColor);
      const foregroundHSL = isDarkBackground ? '0 0% 95%' : '0 0% 5%';
      root.style.setProperty('--foreground', foregroundHSL);
      root.style.setProperty('--card-foreground', foregroundHSL);
      root.style.setProperty('--popover-foreground', foregroundHSL);
      
      root.classList.add('theme-custom');
    };

    const hexToHSL = (hex: string): string => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    const isColorDark = (hex: string): boolean => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness < 128;
    };
    
    // Apply initial theme
    applyTheme(savedTheme, savedColorTheme);
    
    // Listen for theme changes
    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem('theme') || 'system';
      const currentColorTheme = localStorage.getItem('colorTheme') || 'default';
      applyTheme(currentTheme, currentColorTheme);
    };
    
    // Listen for storage changes (when theme is changed from another tab/window)
    window.addEventListener('storage', handleThemeChange);
    
    // Listen for custom theme change events
    window.addEventListener('themechange', handleThemeChange);
    
    return () => {
      window.removeEventListener('storage', handleThemeChange);
      window.removeEventListener('themechange', handleThemeChange);
    };
  }, []);

  // Force viewport recalculation on auth state change (fixes PWA bottom nav gap)
  useEffect(() => {
    if (user) {
      // Slight delay to let PWA viewport settle after login
      const timer = setTimeout(() => {
        // Force viewport recalculation
        window.scrollTo(0, 0);
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event('resize'));
        });
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  return (
    <div className="min-h-screen text-foreground overscroll-none" style={{ backgroundColor: 'var(--background-color, inherit)' }}>
      {/* Status bar background for PWA fullscreen mode (theme-aware) */}
      <div 
        className="fixed top-0 left-0 right-0 bg-white dark:bg-[#0a0a0a] z-[100] pointer-events-none status-bar-bg" 
        style={{ 
          height: 'env(safe-area-inset-top)',
          minHeight: 'env(safe-area-inset-top)'
        }}
      />
      
      {showChrome && <Header />}

      {/* Main Content with safe area top padding */}
      <main className={showChrome ? "pb-20 lg:pb-4 overscroll-none" : "pb-0 overscroll-none"} style={showChrome ? { paddingTop: 'env(safe-area-inset-top)' } : {}}>
        {children}
      </main>

      {showChrome && <BottomNavigation />}
    </div>
  );
};

export default Layout;
