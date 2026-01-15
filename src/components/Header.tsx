
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, Search, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import SearchDialog from "./SearchDialog";
import MenuDrawer from "./MenuDrawer";

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const isBiblePage = location.pathname === "/bible";

  // Handle scroll detection for Bible page
  useEffect(() => {
    if (!isBiblePage) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50); // Hide after 50px of scroll
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isBiblePage]);

  const handleUserIconClick = () => {
    if (user) {
      navigate("/settings");
    } else {
      navigate("/auth");
    }
  };

  return (
    <header className={`glass sticky top-0 z-40 transition-all duration-300 ease-in-out ${isBiblePage && isScrolled ? 'transform -translate-y-full opacity-0' : 'transform translate-y-0 opacity-100'
      }`}>
      <div className="px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-1">
            <div className="w-20 h-20 flex items-center justify-center">
              <img
                src="/lovable-uploads/5c77f128-2db6-4b67-bfe2-b9a79664a7f1.png"
                alt="The Power House Logo"
                className="w-20 h-20 object-contain"
              />
            </div>
            <h1 className="text-xl font-bold text-foreground flex items-center h-20">
              The Power House
            </h1>
          </Link>

          <div className="flex items-center space-x-2">
            <MenuDrawer menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

            <SearchDialog searchOpen={searchOpen} setSearchOpen={setSearchOpen} />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleUserIconClick}
              className="text-muted-foreground hover:text-foreground p-2"
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
