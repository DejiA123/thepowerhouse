import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import BottomNavigation from "./BottomNavigation";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  // Initialize theme on app load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    const savedColorTheme = localStorage.getItem('colorTheme') || 'default';
    const root = document.documentElement;
    const body = document.body;
    
    const applyTheme = (theme: string, colorTheme: string) => {
      // Remove existing theme classes from both html and body
      root.classList.remove('light', 'dark', 'theme-blue', 'theme-green', 'theme-purple', 'theme-yellow', 'theme-red', 'theme-orange');
      body.classList.remove('light', 'dark', 'theme-blue', 'theme-green', 'theme-purple', 'theme-yellow', 'theme-red', 'theme-orange');
      
      // Apply color theme first
      if (colorTheme !== 'default') {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Status bar background for PWA fullscreen mode (theme-aware) */}
      <div 
        className="fixed top-0 left-0 right-0 bg-white dark:bg-[#0a0a0a] z-[100] pointer-events-none status-bar-bg" 
        style={{ 
          height: 'env(safe-area-inset-top)',
          minHeight: 'env(safe-area-inset-top)'
        }}
      />
      
      <Header />

      {/* Main Content with safe area top padding */}
      <main className="pb-20 lg:pb-4" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {children}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Layout;
