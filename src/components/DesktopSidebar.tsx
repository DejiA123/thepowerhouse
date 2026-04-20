import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home, Book, Calendar, Heart, Info, Users, Video,
  MessageSquare, MapPin, Settings, LogOut, FileText, Shield,
  ChevronLeft, ChevronRight, Bookmark
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSidebarShortcuts, ICON_MAP } from "@/hooks/useSidebarShortcuts";
import SidebarCustomizer from "./SidebarCustomizer";
import { Sparkles, PlusCircle } from "lucide-react";

const DesktopSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { shortcuts } = useSidebarShortcuts();
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  const mainNavItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "News", path: "/news", icon: Calendar },
    { name: "Bible", path: "/bible", icon: Book },
    { name: "Notes", path: "/bible-notes", icon: FileText },
    { name: "Give", path: "/give", icon: Heart },
    { name: "Resources", path: "/resources", icon: Info },
  ];

  const secondaryNavItems = [
    { name: "Social Circle", path: "/social", icon: Users },
    { name: "Services", path: "/services", icon: Video },
    { name: "Groups", path: "/groups", icon: Users },
    { name: "Prayer Wall", path: "/prayer", icon: MessageSquare },
    { name: "Campus Fellowships", path: "/campus-fellowships", icon: MapPin },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const NavItem = ({ item }: { item: { name: string; path: string; icon: any } }) => {
    const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
    const Icon = item.icon;

    return (
      <Link
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl transition-all duration-300 group relative overflow-hidden",
          isActive
            ? "text-primary font-medium shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        title={collapsed ? item.name : undefined}
      >
        {/* Active & Hover Background */}
        <div className={cn(
          "absolute inset-0 transition-opacity duration-300 rounded-xl",
          isActive
            ? "bg-gradient-to-r from-primary/15 to-primary/5 opacity-100 dark:from-primary/20 dark:to-primary/10"
            : "bg-accent/40 opacity-0 group-hover:opacity-100"
        )} />

        {/* Active Left Border Indicator */}
        <div className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full transform origin-left transition-transform duration-300 ease-out",
          isActive ? "scale-x-100" : "scale-x-0"
        )} />

        {/* Icon */}
        <div className={cn(
          "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-300 shrink-0 relative z-10",
          isActive
            ? "bg-primary/20 text-primary shadow-sm"
            : "bg-transparent text-muted-foreground group-hover:text-foreground group-hover:bg-background/80"
        )}>
          <Icon className={cn(
            "w-5 h-5 transition-transform duration-300",
            isActive ? "scale-110" : "group-hover:scale-110"
          )} />
        </div>

        {/* Label Content */}
        {!collapsed && (
          <span className={cn(
            "text-sm truncate relative z-10 transition-transform duration-300",
            !isActive && "group-hover:translate-x-1"
          )}>
            {item.name}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-full border-r border-border/50 bg-background/80 backdrop-blur-2xl transition-all duration-400 ease-in-out shrink-0 relative group/sidebar shadow-[4px_0_24px_-16px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_24px_-16px_rgba(0,0,0,0.5)] z-40",
        collapsed ? "w-[88px]" : "w-[280px]"
      )}
    >
      {/* Floating Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute -right-5 top-8 flex items-center justify-center w-10 h-10 rounded-full border border-border/80 bg-background shadow-md hover:bg-accent text-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-300 z-50 opacity-100 group-hover/sidebar:opacity-100 hover:scale-110",
          collapsed && "rotate-180" // Show rotation state clearly
        )}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Header / Logo */}
      <div className="flex items-center gap-3 px-5 py-6 mt-1 relative">
        <Link to="/" className="flex items-center gap-3 min-w-0 group relative z-10 w-full overflow-hidden">
          <div className="relative flex items-center justify-center w-11 h-11 shrink-0 transition-transform duration-500 ease-out group-hover:scale-105">
            <img
              src="/lovable-uploads/5c77f128-2db6-4b67-bfe2-b9a79664a7f1.png"
              alt="The Power House Logo"
              className="w-11 h-11 object-contain drop-shadow-md relative z-10"
            />
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </div>
          {!collapsed && (
            <div className="flex flex-col justify-center min-w-0 transition-all duration-300 opacity-100 translate-x-0">
              <span className="font-bold text-foreground text-[15px] leading-tight tracking-tight truncate bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
                The Power House
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Main Navigation Scroll Area */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-6 scroll-smooth [scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground)/0.2)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full transition-all">
        {/* Primary Navigation */}
        <div className="space-y-0.5">
          {mainNavItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </div>

        {/* Custom Shortcuts */}
        {(shortcuts.length > 0 || user) && (
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-3 mb-3 mt-4 flex items-center justify-between group/title">
                <div className="flex items-center gap-3 opacity-80 flex-1">
                  <div className="h-px bg-border/60 flex-1" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80 whitespace-nowrap">
                    Shortcuts
                  </p>
                  <div className="h-px bg-border/60 flex-1" />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 ml-2 text-muted-foreground hover:text-primary transition-colors rounded-lg"
                  onClick={() => setShowCustomizer(true)}
                  title="Customize Shortcuts"
                >
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            {collapsed && <div className="mx-4 my-4 h-px bg-border/60" />}

            <div className="space-y-0.5">
              {shortcuts.map((item) => {
                const Icon = ICON_MAP[item.icon] || Bookmark;
                return (
                  <NavItem 
                    key={item.id} 
                    item={{ ...item, icon: Icon }} 
                  />
                )
              })}
              
              {shortcuts.length === 0 && !collapsed && (
                 <Button
                    variant="ghost"
                    onClick={() => setShowCustomizer(true)}
                    className="w-full justify-start h-10 px-3 text-xs text-muted-foreground hover:text-primary transition-all rounded-xl border border-dashed border-border/40 hover:border-primary/30"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Add shortcuts
                  </Button>
              )}

              {collapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCustomizer(true)}
                  className="w-9 h-9 mx-auto flex items-center justify-center text-muted-foreground hover:text-primary transition-all rounded-lg hover:bg-primary/10"
                  title="Add Shortcuts"
                >
                  <PlusCircle className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Secondary Navigation */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-3 mb-3 flex items-center gap-3 opacity-80">
              <div className="h-px bg-border/60 flex-1" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 whitespace-nowrap">
                Discover
              </p>
              <div className="h-px bg-border/60 flex-1" />
            </div>
          )}
          {collapsed && <div className="mx-4 my-4 h-px bg-border/60" />}

          <div className="space-y-0.5">
            {secondaryNavItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>
        </div>
      </nav>

      {/* Footer Area */}
      <div className="mt-auto px-4 py-5 bg-background/50 backdrop-blur-md border-t border-border/50 transition-all">
        {!collapsed && (
          <div className="flex gap-2 mb-4 px-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] text-muted-foreground hover:text-foreground flex-1 h-8 rounded-xl bg-accent/30 hover:bg-accent/60 transition-colors border border-transparent hover:border-border/50"
              onClick={() => navigate("/terms-of-service")}
            >
              <FileText className="w-3.5 h-3.5 mr-1.5 opacity-70" />
              Terms
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] text-muted-foreground hover:text-foreground flex-1 h-8 rounded-xl bg-accent/30 hover:bg-accent/60 transition-colors border border-transparent hover:border-border/50"
              onClick={() => navigate("/privacy-policy")}
            >
              <Shield className="w-3.5 h-3.5 mr-1.5 opacity-70" />
              Privacy
            </Button>
          </div>
        )}

        {user && (
          <button
            onClick={handleSignOut}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-all duration-300 group relative overflow-hidden",
            )}
            title={collapsed ? "Sign Out" : undefined}
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 group-hover:bg-destructive/20 transition-colors relative z-10">
              <LogOut className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-0.5" />
            </div>
            {!collapsed && (
              <span className="text-sm font-medium relative z-10 transition-transform duration-300 group-hover:translate-x-0.5">Sign Out</span>
            )}
            {/* Hover Background effect */}
            <div className="absolute inset-0 bg-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
          </button>
        )}
      </div>

      <SidebarCustomizer 
        isOpen={showCustomizer} 
        onClose={() => setShowCustomizer(false)} 
      />
    </aside>
  );
};

export default DesktopSidebar;
