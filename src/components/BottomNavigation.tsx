
import { Link, useLocation } from "react-router-dom";
import { Home, Book, Calendar, Heart, Info } from "lucide-react";
const BottomNavigation = () => {
  const location = useLocation();

                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

    <nav className="fixed bottom-0 left-0 right-0 bg-card backdrop-blur-md border-t border-border/30 z-[102] h-[72px] will-change-transform">
