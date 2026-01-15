
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import {
  Search,
  X,
  ArrowRight,
  BookOpen,
  Calendar,
  Heart,
  Video,
  Home,
  Users,
  Music,
  MapPin,
  ChevronRight,
  Sparkles,
  Briefcase,
  HandHeart,
  Megaphone,
  School,
  Building,
  UserPlus,
  FolderOpen
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { searchService, SearchResult } from "@/services/searchService";

interface SearchDialogProps {
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

type SearchItem = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  category: "Page" | "Media" | "Event" | "Bible" | "Folder" | "Song";
  color?: string;
  keywords?: string[];
  isDynamic?: boolean;
};

const SearchDialog = ({ searchOpen, setSearchOpen }: SearchDialogProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [dynamicResults, setDynamicResults] = useState<SearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search query to avoid too many API calls
  // Simple debounce logic since I don't want to rely on an external hook if not present
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset search when closed
  useEffect(() => {
    if (!searchOpen) {
      setTimeout(() => setSearchQuery(""), 300);
      setDynamicResults([]);
    }
  }, [searchOpen]);

  const handleNavigate = (path: string) => {
    navigate(path);
    setSearchOpen(false);
  };

  // Static Data
  const staticItems: SearchItem[] = useMemo(() => [
    // Core Pages
    { id: "home", title: "Home", description: "Return to homepage", icon: Home, path: "/", category: "Page", color: "text-blue-500", keywords: ["index", "main", "start"] },
    { id: "bible", title: "Bible", description: "Read the word of God", icon: BookOpen, path: "/bible", category: "Bible", color: "text-amber-500", keywords: ["scripture", "verse", "read"] },
    { id: "events", title: "Events & News", description: "Upcoming church gatherings", icon: Calendar, path: "/news", category: "Event", color: "text-green-500", keywords: ["calendar", "schedule", "meeting"] },
    { id: "give", title: "Give", description: "Support the ministry", icon: Heart, path: "/give", category: "Page", color: "text-rose-500", keywords: ["donate", "offering", "tithe"] },
    { id: "sermons", title: "Sermons", description: "Watch past messages", icon: Video, path: "/sermons", category: "Media", color: "text-purple-500", keywords: ["watch", "video", "message", "preaching"] },

    // Groups & Departments
    { id: "groups", title: "Life Groups", description: "Join a community", icon: Users, path: "/groups", category: "Page", color: "text-indigo-500", keywords: ["community", "fellowship", "connect"] },
    { id: "management", title: "Management Team", description: "Dept. Resources & Admin", icon: Briefcase, path: "/groups/management", category: "Page", color: "text-slate-600", keywords: ["admin", "staff", "leadership", "planning", "resources page"] },
    { id: "choir", title: "Choir Department", description: "Worship team resources", icon: Music, path: "/groups/choir", category: "Page", color: "text-pink-500", keywords: ["music", "worship", "singing", "band"] },
    { id: "ushering", title: "Ushering Unit", description: "Service & Hospitality", icon: HandHeart, path: "/groups/ushering", category: "Page", color: "text-orange-500", keywords: ["welcome", "hospitality", "serve"] },
    { id: "evangelism", title: "Evangelism", description: "Outreach & Soul Winning", icon: Megaphone, path: "/groups/evangelism", category: "Page", color: "text-red-500", keywords: ["outreach", "missions", "soul winning"] },
    { id: "campus", title: "Campus Fellowships", description: "Student ministries", icon: School, path: "/campus-fellowships", category: "Page", color: "text-cyan-600", keywords: ["students", "university", "college", "uog", "atu", "tus"] },

    // Ministry & Involvement
    { id: "serve", title: "Serve", description: "Volunteer in a team", icon: HandHeart, path: "/serve", category: "Page", color: "text-emerald-600", keywords: ["volunteer", "join team", "help"] },
    { id: "building", title: "Building Campaign", description: "Future home project", icon: Building, path: "/building-campaign", category: "Page", color: "text-amber-700", keywords: ["project", "construction", "fund", "future"] },
    { id: "new", title: "I'm New", description: "New to The Power House?", icon: UserPlus, path: "/new-here", category: "Page", color: "text-blue-400", keywords: ["visitor", "guest", "welcome"] },
    { id: "followup", title: "Follow Up", description: "Discipleship resources", icon: UserPlus, path: "/follow-up", category: "Page", color: "text-violet-500", keywords: ["growth", "next steps"] },
    { id: "locations", title: "Locations", description: "Find a campus near you", icon: MapPin, path: "/locations", category: "Page", color: "text-cyan-500", keywords: ["address", "map", "directions"] },
    { id: "prayer", title: "Prayer Wall", description: "Submit and view prayers", icon: Sparkles, path: "/prayer", category: "Page", color: "text-yellow-500", keywords: ["request", "intercession"] },

    // Bible Books
    { id: "gen", title: "Genesis", description: "Bible Book", icon: BookOpen, path: "/bible?book=Genesis", category: "Bible", keywords: ["creation", "noah", "abraham"] },
    { id: "psa", title: "Psalms", description: "Bible Book", icon: BookOpen, path: "/bible?book=Psalms", category: "Bible", keywords: ["david", "worship", "praise"] },
    { id: "mat", title: "Matthew", description: "Bible Book", icon: BookOpen, path: "/bible?book=Matthew", category: "Bible", keywords: ["gospel", "jesus"] },
    { id: "john", title: "John", description: "Bible Book", icon: BookOpen, path: "/bible?book=John", category: "Bible", keywords: ["gospel", "jesus", "love"] },
    { id: "rev", title: "Revelation", description: "Bible Book", icon: BookOpen, path: "/bible?book=Revelation", category: "Bible", keywords: ["prophecy", "end times"] },
  ], []);

  // Fetch Dynamic Results
  useEffect(() => {
    const fetchDynamic = async () => {
      if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
        setDynamicResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchService.searchApp(debouncedQuery);

        // Convert to SearchItem format
        const items: SearchItem[] = results.map(r => {
          let icon = Sparkles;
          let color = "text-slate-500";
          let category: SearchItem['category'] = "Page";

          if (r.type === 'folder') {
            icon = FolderOpen;
            color = "text-yellow-500";
            category = "Folder";
          } else if (r.type === 'song') {
            icon = Music;
            color = "text-pink-500";
            category = "Song";
          } else if (r.type === 'event') {
            icon = Calendar;
            color = "text-purple-500";
            category = "Event";
          }

          return {
            id: r.id,
            title: r.title,
            description: r.description || "",
            icon,
            path: r.url,
            category,
            color,
            isDynamic: true
          };
        });

        setDynamicResults(items);
      } catch (e) {
        console.error("Search error", e);
      } finally {
        setIsSearching(false);
      }
    };

    fetchDynamic();
  }, [debouncedQuery]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();

    // Filter static items
    const staticMatches = staticItems.filter(item => {
      // Category Filter (Basic mapping for static items)
      if (activeCategory !== "All" && item.category !== activeCategory &&
        !(activeCategory === "Media" && item.category === "Song")) return false; // Basic looseness

      // Content Filter
      return (
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.keywords?.some(k => k.toLowerCase().includes(query))
      );
    });

    // Merge with dynamic results
    // Filter dynamic results by category if needed
    const dynamicMatches = dynamicResults.filter(item =>
      activeCategory === "All" || item.category === activeCategory
    );

    return [...staticMatches, ...dynamicMatches].slice(0, 15); // Increased limit
  }, [searchQuery, staticItems, dynamicResults, activeCategory]);

  const quickLinks = staticItems.slice(0, 4);

  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-300 w-10 h-10 group"
        >
          <Search className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="sr-only">Search</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="w-screen h-[100dvh] max-w-none m-0 p-0 border-none bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl duration-200 gap-0 data-[state=open]:slide-in-from-bottom-5 [&>button]:hidden">
        <DialogTitle className="sr-only">Search</DialogTitle>

        {/* Header / Search Bar */}
        <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 pt-safe-top">
          <div className="container mx-auto max-w-2xl px-4 py-4 flex items-center gap-4">
            <Search className="w-6 h-6 text-slate-400 shrink-0" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 'Sodiq', 'Events', 'Choir'..."
              className="border-none shadow-none focus-visible:ring-0 px-0 text-xl md:text-2xl font-medium bg-transparent placeholder:text-slate-300 dark:placeholder:text-slate-600 h-auto py-2"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(false)}
              className="shrink-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-6 h-6 text-slate-500" />
            </Button>
          </div>

          {/* Category Tabs */}
          {searchQuery && (
            <div className="container mx-auto max-w-2xl px-4 pb-0 flex gap-1 overflow-x-auto no-scrollbar">
              {["All", "Page", "Folder", "Song", "Bible", "Event"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    activeCategory === cat
                      ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-2xl px-4 py-8 pb-32 space-y-8">

            {/* Empty State */}
            {!searchQuery && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Visual Quick Links */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Quick Access</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {quickLinks.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.path)}
                        className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-100 dark:hover:border-blue-900/50 transition-all group text-center"
                      >
                        <div className={cn("p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm group-hover:scale-110 transition-transform duration-300", item.color)}>
                          <item.icon className="w-6 h-6" />
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {item.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Search Results */}
            {searchQuery && (
              <div className="space-y-2">
                {isSearching && filteredItems.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white"></div>
                  </div>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.path)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all group text-left animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                      <div className={cn("p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800", item.color)}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900 dark:text-white truncate">
                            {item.title}
                          </h4>
                          <span className={cn(
                            "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500",
                            item.isDynamic && "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                          )}>
                            {item.category}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 truncate">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12">
                    {!isSearching && (
                      <>
                        <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mx-auto mb-4">
                          <Search className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No results found</h3>
                        <p className="text-slate-500">Try searching for "{searchQuery.slice(0, 10)}..." or something else</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog;
