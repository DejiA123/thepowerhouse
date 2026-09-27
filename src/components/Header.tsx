
import { lazy, Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Search, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
// Loaded when first opened (and quietly once the app is idle), so they don't
// slow down the app's start
const loadSearch = () => import("./SearchDialog");
const loadMenu = () => import("./MenuDrawer");
const SearchDialog = lazy(loadSearch);
const MenuDrawer = lazy(loadMenu);

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchUsed, setSearchUsed] = useState(false);
  const [menuUsed, setMenuUsed] = useState(false);

  useEffect(() => {
    const warm = () => {
      loadMenu();
      loadSearch();
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const t = setTimeout(() => (idle ? idle(warm) : warm()), 2500);
    return () => clearTimeout(t);
  }, []);

  const handleUserIconClick = () => {
    if (user) {
      navigate("/settings");
    } else {
      navigate("/auth");
    }
  };

  return (
    <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
      <div className="px-4 pb-2 pt-[calc(0.5rem+max(env(safe-area-inset-top),var(--sat-fallback,0px)))]">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-1 tap-feedback">
            <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
              <img
                src="/lovable-uploads/5c77f128-2db6-4b67-bfe2-b9a79664a7f1.png"
                alt="The Power House Logo"
                className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
              />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center h-12 sm:h-16 whitespace-nowrap">
              The Power House
            </h1>
          </Link>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground p-2 rounded-xl tap-feedback"
              onClick={() => {
                setMenuUsed(true);
                setMenuOpen(true);
              }}
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
            {menuUsed && (
              <Suspense fallback={null}>
                <MenuDrawer menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
              </Suspense>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-300 w-10 h-10 group"
              onClick={() => {
                setSearchUsed(true);
                setSearchOpen(true);
              }}
            >
              <Search className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="sr-only">Search</span>
            </Button>
            {searchUsed && (
              <Suspense fallback={null}>
                <SearchDialog searchOpen={searchOpen} setSearchOpen={setSearchOpen} />
              </Suspense>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleUserIconClick}
              className="text-muted-foreground hover:text-foreground p-2 rounded-xl tap-feedback"
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
