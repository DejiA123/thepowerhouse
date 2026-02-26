import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home, Book, Calendar, Heart, Info, Users, Video,
  MessageSquare, MapPin, Settings, LogOut, FileText, Shield,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DesktopSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const mainNavItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "News", path: "/news", icon: Calendar },
    { name: "Bible", path: "/bible", icon: Book },
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
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    return (
      <Link
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
          isActive
            ? "bg-primary/10 text-primary font-semibold shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
        title={collapsed ? item.name : undefined}
      >
        <div className={cn(
          "flex items-center justify-center w-9 h-9 rounded-lg transition-colors shrink-0",
          isActive ? "bg-primary/15" : "bg-transparent group-hover:bg-accent"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        {!collapsed && (
          <span className="text-sm truncate">{item.name}</span>
        )}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
        )}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-full border-r border-border bg-card/50 backdrop-blur-sm transition-all duration-300 shrink-0",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <img
            src="/lovable-uploads/5c77f128-2db6-4b67-bfe2-b9a79664a7f1.png"
            alt="The Power House Logo"
            className="w-10 h-10 object-contain shrink-0"
          />
          {!collapsed && (
            <span className="font-bold text-foreground text-sm truncate">
              The Power House
            </span>
          )}
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        <div className="space-y-0.5">
          {mainNavItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </div>

        {/* Divider */}
        <div className="my-3 mx-3 border-t border-border" />

        {!collapsed && (
          <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            More
          </p>
        )}

        <div className="space-y-0.5">
          {secondaryNavItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-2 py-3 space-y-1">
        {!collapsed && (
          <div className="flex gap-1 mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] text-muted-foreground hover:text-foreground flex-1"
              onClick={() => navigate("/terms-of-service")}
            >
              <FileText className="w-3 h-3 mr-1" />
              Terms
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] text-muted-foreground hover:text-foreground flex-1"
              onClick={() => navigate("/privacy-policy")}
            >
              <Shield className="w-3 h-3 mr-1" />
              Privacy
            </Button>
          </div>
        )}

        {user && (
          <button
            onClick={handleSignOut}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-destructive hover:bg-destructive/10 transition-colors",
            )}
            title={collapsed ? "Sign Out" : undefined}
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
