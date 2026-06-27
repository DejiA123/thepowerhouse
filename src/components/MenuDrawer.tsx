import { useState } from "react";
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
  Video,
  MessageSquare,
  MapPin,
  Settings,
  FileText,
  Shield,
  PlusCircle,
} from "lucide-react";
import { useSidebarShortcuts, ICON_MAP } from "@/hooks/useSidebarShortcuts";
import SidebarCustomizer from "./SidebarCustomizer";
import { motion, AnimatePresence } from "framer-motion";

interface MenuDrawerProps {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}

const MenuDrawer = ({ menuOpen, setMenuOpen }: MenuDrawerProps) => {
  const { user, signOut } = useAuth();
  const { shortcuts } = useSidebarShortcuts();
  const [showCustomizer, setShowCustomizer] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const menuItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Bible", path: "/bible", icon: Book },
    { name: "Notes", path: "/bible-notes", icon: FileText },
    { name: "Give", path: "/give", icon: Heart },
    { name: "Resources", path: "/resources", icon: Info },
    { name: "Social Circle", path: "/social", icon: Users },
    { name: "Services", path: "/services", icon: Video },
    { name: "Groups", path: "/groups", icon: Users },
    { name: "Prayer Wall", path: "/prayer", icon: MessageSquare },
    { name: "Campus Fellowships", path: "/campus-fellowships", icon: MapPin },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const itemVariants = {
    hidden: { opacity: 0, x: -16 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.03, duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }
    })
  };

  return (
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground p-2 rounded-xl tap-feedback">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] border-r border-border/50 bg-background/95 backdrop-blur-xl">
        <SheetHeader className="text-left border-b border-border/50 pb-4 mb-4">
          <SheetTitle className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 dark:from-primary dark:to-violet-400">
            Navigation
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full">
          <div className="space-y-1 overflow-y-auto flex-1 custom-scrollbar pr-2">
            {/* Custom Shortcuts Section */}
            {(shortcuts.length > 0 || user) && (
              <div className="mb-6 space-y-1">
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Your Shortcuts</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-primary rounded-lg"
                    onClick={() => setShowCustomizer(true)}
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </Button>
                </div>
                
                <AnimatePresence>
                  {shortcuts.map((item, i) => {
                    const isActive = location.pathname === item.path;
                    const Icon = ICON_MAP[item.icon] || PlusCircle;

                    return (
                      <motion.div
                        key={item.id}
                        custom={i}
                        initial="hidden"
                        animate="visible"
                        variants={itemVariants}
                      >
                        <Button
                          variant="ghost"
                          className={`w-full justify-start h-12 rounded-xl transition-all duration-200 tap-feedback ${isActive
                            ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-sm dark:bg-primary/20"
                            : "text-foreground/70 hover:bg-muted hover:text-primary"
                            }`}
                          onClick={() => {
                            navigate(item.path);
                            setMenuOpen(false);
                          }}
                        >
                          <div className={`p-2 rounded-lg mr-3 ${isActive ? 'bg-primary/15 dark:bg-primary/25' : 'bg-muted'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {item.name}
                        </Button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {shortcuts.length === 0 && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 rounded-xl text-muted-foreground hover:text-primary border border-dashed border-border tap-feedback"
                    onClick={() => setShowCustomizer(true)}
                  >
                    <div className="p-2 rounded-lg mr-3 bg-muted">
                      <PlusCircle className="w-4 h-4" />
                    </div>
                    Add Shortcuts
                  </Button>
                )}
                <div className="h-px bg-border/50 my-4 mx-2" />
              </div>
            )}

            {menuItems.map((item, i) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.path}
                  custom={i + shortcuts.length}
                  initial={menuOpen ? "hidden" : false}
                  animate="visible"
                  variants={itemVariants}
                >
                  <Button
                    variant="ghost"
                    className={`w-full justify-start h-12 rounded-xl transition-all duration-200 tap-feedback ${isActive
                      ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-sm dark:bg-primary/20"
                      : "text-foreground/70 hover:bg-muted hover:text-primary"
                      }`}
                    onClick={() => {
                      navigate(item.path);
                      setMenuOpen(false);
                    }}
                  >
                    <div className={`p-2 rounded-lg mr-3 ${isActive ? 'bg-primary/15 dark:bg-primary/25' : 'bg-muted'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {item.name}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-auto border-t border-border/50 pt-4 pb-8 space-y-2">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button
                variant="ghost"
                className="justify-start text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary tap-feedback"
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
                className="justify-start text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary tap-feedback"
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
                className="w-full justify-start h-12 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 font-bold border border-transparent hover:border-red-100 dark:hover:border-red-500/20 tap-feedback"
                onClick={() => {
                  handleSignOut();
                  setMenuOpen(false);
                }}
              >
                <div className="p-2 rounded-lg mr-3 bg-red-50 dark:bg-red-500/10">
                  <LogOut className="w-4 h-4" />
                </div>
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
      <SidebarCustomizer 
        isOpen={showCustomizer} 
        onClose={() => setShowCustomizer(false)} 
      />
    </Sheet>
  );
};

export default MenuDrawer;
