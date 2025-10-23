
import { Link, useLocation } from "react-router-dom";
import { Home, Book, Calendar, Heart, Info } from "lucide-react";

const navItems = [
  { name: "Home", icon: <Home />, path: "/" },
  { name: "Bible", icon: <Book />, path: "/bible" },
  { name: "Events", icon: <Calendar />, path: "/news" },
  { name: "Prayer", icon: <Heart />, path: "/prayer-wall" },
  { name: "Info", icon: <Info />, path: "/resources" },
];

const BottomNavigation = () => {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card backdrop-blur-md border-t border-border/30 z-[102] h-[72px] will-change-transform">
      <div className="flex justify-around items-center h-full">
        {navItems.map((item) => (
          <Link key={item.name} to={item.path} className={`flex flex-col items-center justify-center text-xs ${location.pathname === item.path ? 'text-primary' : 'text-muted-foreground'}`}> 
            {item.icon}
            <span>{item.name}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavigation;
