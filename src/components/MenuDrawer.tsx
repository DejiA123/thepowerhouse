
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Home, 
  Book, 
  Users, 
  LogOut,
  Menu,
  Calendar,
  Heart,
  Info,
  Settings,
  Video,
  MessageSquare,
  MapPin
} from "lucide-react";

interface MenuDrawerProps {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}

const MenuDrawer = ({ menuOpen, setMenuOpen }: MenuDrawerProps) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const menuItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "News", path: "/news", icon: Calendar },
    { name: "Bible", path: "/bible", icon: Book },
    { name: "Give", path: "/give", icon: Heart },
    { name: "Resources", path: "/resources", icon: Info },
    { name: "Services", path: "/services", icon: Video },
    { name: "Groups", path: "/groups", icon: Users },
    { name: "Prayer Wall", path: "/prayer", icon: MessageSquare },
    { name: "Campus Fellowships", path: "/campus-fellowships", icon: MapPin },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground p-2">
          <Menu className="w-5 h-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Menu</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 py-2">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={`w-full justify-start ${
                    isActive ? "bg-accent text-accent-foreground" : ""
                  }`}
                  onClick={() => {
                    navigate(item.path);
                    setMenuOpen(false);
                  }}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Button>
              );
            })}
            {user && (
              <Button
                variant="ghost"
                className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => {
                  handleSignOut();
                  setMenuOpen(false);
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default MenuDrawer;
