
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  MapPin,
  FileText,
  Shield
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
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground p-2">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] border-r border-indigo-100 bg-white/95 backdrop-blur-xl">
        <SheetHeader className="text-left border-b border-indigo-50 pb-4 mb-4">
          <SheetTitle className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            Navigation
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full">
          <div className="space-y-1 overflow-y-auto flex-1 custom-scrollbar pr-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={`w-full justify-start h-12 rounded-xl transition-all duration-200 ${isActive
                      ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-indigo-600"
                    }`}
                  onClick={() => {
                    navigate(item.path);
                    setMenuOpen(false);
                  }}
                >
                  <div className={`p-2 rounded-lg mr-3 ${isActive ? 'bg-indigo-100' : 'bg-gray-100 group-hover:bg-indigo-100'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {item.name}
                </Button>
              );
            })}
          </div>

          <div className="mt-auto border-t border-indigo-50 pt-4 pb-8 space-y-2">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button
                variant="ghost"
                className="justify-start text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-indigo-600"
                onClick={() => {
                  navigate("/terms-of-service");
                  setMenuOpen(false);
                }}
              >
                <FileText className="w-3 h-3 mr-2" />
                Terms
              </Button>
              <Button
                variant="ghost"
                className="justify-start text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-indigo-600"
                onClick={() => {
                  navigate("/privacy-policy");
                  setMenuOpen(false);
                }}
              >
                <Shield className="w-3 h-3 mr-2" />
                Privacy
              </Button>
            </div>

            {user && (
              <Button
                variant="ghost"
                className="w-full justify-start h-12 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 font-bold border border-transparent hover:border-red-100"
                onClick={() => {
                  handleSignOut();
                  setMenuOpen(false);
                }}
              >
                <div className="p-2 rounded-lg mr-3 bg-red-50">
                  <LogOut className="w-4 h-4" />
                </div>
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MenuDrawer;
