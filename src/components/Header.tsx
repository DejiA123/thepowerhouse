
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Search, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import SearchDialog from "./SearchDialog";
import MenuDrawer from "./MenuDrawer";

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
            <MenuDrawer menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

            <SearchDialog searchOpen={searchOpen} setSearchOpen={setSearchOpen} />

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
