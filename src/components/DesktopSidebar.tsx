import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Bookmark, ChevronLeft, CircleHelp, LogIn, Search, Settings } from "lucide-react";
import { useState, useEffect, lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import { useSidebarShortcuts, ICON_MAP } from "@/hooks/useSidebarShortcuts";
import { SECTIONS, sectionForPath } from "@/data/appDirectory";
import { openSearch } from "@/lib/appEvents";
import { church } from '@/config/church';
const SidebarCustomizer = lazy(() => import("./SidebarCustomizer"));

/**
 * Tablets and computers: the same five places as the phone's bottom bar, each
 * with a line saying what's inside, search at the top and Help at the bottom.
 */
const DesktopSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { shortcuts } = useSidebarShortcuts();
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  const active = sectionForPath(location.pathname);

  const itemClass = (on: boolean) =>
    cn(
      "flex items-center gap-3 rounded-2xl transition-colors duration-200",
      collapsed ? "mx-auto h-14 w-14 justify-center" : "min-h-[58px] px-3 py-2",
      on ? "bg-primary/10 text-primary dark:bg-primary/20" : "text-slate-700 hover:bg-accent/60 dark:text-slate-200",
    );

  const pictureClass = (on: boolean) =>
    cn(
      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
      on ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    );

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-full border-r border-border/50 bg-background/80 backdrop-blur-2xl transition-all duration-300 ease-in-out shrink-0 relative group/sidebar shadow-[4px_0_24px_-16px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_24px_-16px_rgba(0,0,0,0.5)] z-40",
        collapsed ? "w-[92px]" : "w-[272px]"
      )}
    >
      {/* Make the sidebar narrow / wide */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute -right-5 top-8 flex items-center justify-center w-10 h-10 rounded-full border border-border/80 bg-background shadow-md hover:bg-accent text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 z-50 hover:scale-110",
          collapsed && "rotate-180"
        )}
        title={collapsed ? "Show names" : "Hide names"}
        aria-label={collapsed ? "Show names" : "Hide names"}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Logo */}
      <div className={cn("flex items-center gap-3 pb-4 pt-6", collapsed ? "justify-center px-2" : "px-5")}>
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img src={church.brand.logo} alt={church.name} className="h-11 w-11 shrink-0 object-contain drop-shadow-md" />
          {!collapsed && <span className="truncate font-outfit text-[17px] font-semibold tracking-tight text-foreground">{church.name}</span>}
        </Link>
      </div>

      {/* Search, on every page */}
      <div className={cn("pb-3", collapsed ? "px-4" : "px-4")}>
        <button
          onClick={() => openSearch()}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-blue-100 bg-card text-muted-foreground shadow-sm transition hover:border-blue-300 dark:border-slate-700",
            collapsed ? "h-14 justify-center" : "h-12 px-4",
          )}
          aria-label="Search"
          title="Search"
        >
          <Search className="h-5 w-5 shrink-0 text-primary" />
          {!collapsed && <span className="text-[15px]">Search anything</span>}
        </button>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-1 [scrollbar-width:thin]">
        <div data-tour="tabs" className="space-y-1">
          {SECTIONS.map((section) => {
            const on = section.id === active;
            return (
              <Link
                key={section.id}
                to={section.path}
                aria-current={on ? "page" : undefined}
                className={itemClass(on)}
                title={collapsed ? section.title : undefined}
              >
                <span className={pictureClass(on)}>
                  <section.icon className="h-[22px] w-[22px]" />
                </span>
                {!collapsed && (
                  <span className="min-w-0">
                    <span className="block text-[16px] font-semibold leading-tight">{section.title}</span>
                    <span className="block truncate text-[12.5px] font-medium text-muted-foreground">{section.subtitle}</span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Shortcuts people have added themselves */}
        {shortcuts.length > 0 && (
          <div className="mt-6">
            {!collapsed && (
              <div className="mb-1 flex items-center justify-between px-3">
                <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Your shortcuts</p>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-primary"
                  onClick={() => setShowCustomizer(true)}
                  title="Change shortcuts"
                  aria-label="Change shortcuts"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="space-y-0.5">
              {shortcuts.map((item) => {
                const Icon = ICON_MAP[item.icon] || Bookmark;
                const on = location.pathname === item.path;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-xl text-[14.5px] font-medium transition-colors",
                      collapsed ? "mx-auto h-12 w-12 justify-center" : "h-11 px-3",
                      on ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Help, and signing in */}
      <div className="mt-auto space-y-1 border-t border-border/50 px-3 py-4">
        {!user && (
          <button onClick={() => navigate("/auth")} className={cn(itemClass(false), "w-full text-left")} title={collapsed ? "Sign in" : undefined}>
            <span className={cn(pictureClass(false), "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300")}>
              <LogIn className="h-[22px] w-[22px]" />
            </span>
            {!collapsed && (
              <span>
                <span className="block text-[16px] font-semibold leading-tight">Sign in</span>
                <span className="block text-[12.5px] font-medium text-muted-foreground">Or create an account</span>
              </span>
            )}
          </button>
        )}
        <Link to="/help" data-tour="help" className={itemClass(location.pathname === "/help")} title={collapsed ? "Help" : undefined}>
          <span className={pictureClass(location.pathname === "/help")}>
            <CircleHelp className="h-[22px] w-[22px]" />
          </span>
          {!collapsed && (
            <span>
              <span className="block text-[16px] font-semibold leading-tight">Help</span>
              <span className="block text-[12.5px] font-medium text-muted-foreground">How do I…?</span>
            </span>
          )}
        </Link>
      </div>

      {showCustomizer && (
        <Suspense fallback={null}>
          <SidebarCustomizer isOpen={showCustomizer} onClose={() => setShowCustomizer(false)} />
        </Suspense>
      )}
    </aside>
  );
};

export default DesktopSidebar;
