
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Book,
  Download,
  FileText,
  Video,
  Headphones,
  Users,
  Calendar,
  Heart,
  ChevronRight,
  PlayCircle,
  MessageCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import LocationSelector from "@/components/LocationSelector";
import BibleReadingPlans from "@/components/BibleReadingPlans";
import PrayerRequestForm from "@/components/PrayerRequestForm";
import { ResourceService, ResourceItem, ResourceCategory } from "@/services/resourceService";

const ResourcesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [showReadingPlans, setShowReadingPlans] = useState(false);
  const [showPrayerRequest, setShowPrayerRequest] = useState(false);
  const [resourceCategories, setResourceCategories] = useState<ResourceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingResource, setViewingResource] = useState<{ name: string; content: string } | null>(null);

  const handleDownload = async (itemName: string, category: string) => {
    if (category === "Interactive Session") {
      const content = `${category}: ${itemName}\n\nThis is a sample interactive session document from The Power House International Church.\n\nHere you would find the full content of the session, including scripture references, prayer points, and discussion questions.`;
      setViewingResource({ name: itemName, content });
      return;
    }

    try {
      // Record the download in the database
      await ResourceService.recordDownload(
        itemName,
        category,
        ResourceService.getClientIP(),
        ResourceService.getUserAgent()
      );

      // Update local state to reflect increment
      setResourceCategories(prevCategories =>
        prevCategories.map(cat =>
          cat.title === category
            ? {
              ...cat,
              items: cat.items.map(item =>
                item.name === itemName
                  ? { ...item, downloads: item.downloads + 1 }
                  : item
              )
            }
            : cat
        )
      );

      // Create a dummy file download
      const element = document.createElement("a");
      const file = new Blob([`${category}: ${itemName} - This is a sample document from The Power House International Church.`], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `${itemName.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast({
        title: "Download Started",
        description: `${itemName} is being downloaded.`,
      });
    } catch (error) {
      console.error('Error handling download:', error);
      toast({
        title: "Download Error",
        description: "There was an error processing your download. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Initialize resource categories with real download counts
  useEffect(() => {
    const initializeResources = async () => {
      try {
        setLoading(true);

        // Get download counts from database
        const downloadCounts = await ResourceService.getResourceDownloadCounts();

        const initialCategories: ResourceCategory[] = [
          {
            title: "Interactive Session",
            icon: <MessageCircle className="w-5 h-5" />,
            items: [
              {
                name: "Prayer",
                description: "Deepening your conversation with God",
                downloads: downloadCounts["Interactive Session"]?.["Prayer"] || 0
              },
              {
                name: "Humility",
                description: "The path to spiritual greatness",
                downloads: downloadCounts["Interactive Session"]?.["Humility"] || 0
              },
              {
                name: "Giving",
                description: "The heart of generosity",
                downloads: downloadCounts["Interactive Session"]?.["Giving"] || 0
              },
              {
                name: "Faith",
                description: "Trusting God in all seasons",
                downloads: downloadCounts["Interactive Session"]?.["Faith"] || 0
              },
              {
                name: "Word of God",
                description: "The lamp to our feet",
                downloads: downloadCounts["Interactive Session"]?.["Word of God"] || 0
              }
            ]
          }
        ];

        setResourceCategories(initialCategories);
      } catch (error) {
        console.error('Error initializing resources:', error);
        // Fallback to default categories
        setResourceCategories([]);
      } finally {
        setLoading(false);
      }
    };

    initializeResources();
  }, []);

  const quickActions = [
    {
      title: "Join Life Group",
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      shadow: "shadow-blue-500/20",
      onClick: () => navigate("/groups")
    },
    {
      title: "Prayer Request",
      icon: Heart,
      color: "from-blue-400 to-blue-600",
      shadow: "shadow-blue-400/20",
      onClick: () => setShowPrayerRequest(true)
    },
    {
      title: "Events",
      icon: Calendar,
      color: "from-green-500 to-emerald-500",
      shadow: "shadow-green-500/20",
      onClick: () => navigate("/news")
    },
    {
      title: "Bible Plans",
      icon: Book,
      color: "from-orange-500 to-amber-500",
      shadow: "shadow-orange-500/20",
      onClick: () => navigate("/bible-reading-plans")
    },
    {
      title: "Follow Up",
      icon: ChevronRight,
      color: "from-rose-500 to-pink-600",
      shadow: "shadow-rose-500/20",
      onClick: () => navigate("/follow-up")
    },
    {
      title: "Group Chats",
      icon: MessageCircle,
      color: "from-blue-600 to-blue-800",
      shadow: "shadow-blue-600/20",
      onClick: () => navigate("/group-chats")
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-32">
      {/* Hero Section */}
      <div className="relative bg-primary pt-12 pb-20 px-6 rounded-b-[2.5rem] shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 opacity-90" />
        <div className="absolute inset-0 bg-[url('/patterns/circuit.svg')] opacity-10" />

        <div className="relative z-10 text-center text-white max-w-lg mx-auto">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Resources</h1>
          <p className="text-blue-100/90 text-sm font-medium">Equipping you for your spiritual journey</p>
        </div>
      </div>

      <div className="px-4 -mt-12 relative z-20 space-y-6 max-w-4xl mx-auto">
        {/* Location Selector */}
        <LocationSelector />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="group relative overflow-hidden bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 text-left border border-gray-100 dark:border-gray-700/50"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${action.color} opacity-10 rounded-bl-[4rem] group-hover:scale-110 transition-transform duration-500`} />
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white mb-3 shadow-lg ${action.shadow}`}>
                <action.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{action.title}</h3>
            </button>
          ))}
        </div>


        {/* Categories */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {resourceCategories.map((category, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-center space-x-2 px-1">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    {category.icon}
                  </div>
                  <h2 className="font-bold text-gray-900 dark:text-white text-lg">{category.title}</h2>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50">
                  {category.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="group flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => handleDownload(item.name, category.title)}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{item.name}</h4>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 line-clamp-1">{item.description}</p>
                        <div className="flex items-center mt-1.5 space-x-3">
                          <span className="text-[10px] items-center flex font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">
                            <Download className="w-3 h-3 mr-1" />
                            {item.downloads}
                          </span>
                          {category.title === "Interactive Session" && (
                            <span className="text-[10px] items-center flex font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                              <Book className="w-3 h-3 mr-1" />
                              View
                            </span>
                          )}
                        </div>
                      </div>
                      {category.title !== "Interactive Session" && (
                        <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                          <Download className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bible Reading Plans Dialog */}
      <Dialog open={showReadingPlans} onOpenChange={setShowReadingPlans}>
        <DialogContent className="max-w-4xl max-h-[80vh] mt-24 sm:mt-16 md:mt-20 lg:mt-24 p-0 bg-white/95 backdrop-blur-xl border-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-4 border-b border-gray-100">
            <DialogTitle>Bible Reading Plans</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto p-4">
            <BibleReadingPlans />
          </div>
        </DialogContent>
      </Dialog>

      {/* Prayer Request Dialog - Full Screen */}
      <Dialog open={showPrayerRequest} onOpenChange={setShowPrayerRequest}>
        <DialogContent className="w-screen h-screen max-w-none m-0 p-0 bg-white dark:bg-gray-900 border-0 rounded-none data-[state=open]:slide-in-from-bottom-0">
          <div className="flex flex-col h-full">
            <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-blue-900 to-blue-700 text-white p-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold text-white">Submit Prayer Request</DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPrayerRequest(false)}
                  className="text-white hover:bg-white/20 rounded-full focus:ring-0 focus-visible:ring-0 focus:outline-none"
                >
                  Close
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 pb-[calc(2rem+max(env(safe-area-inset-bottom),20px))]">
              <PrayerRequestForm onSuccess={() => setShowPrayerRequest(false)} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!viewingResource} onOpenChange={(open) => !open && setViewingResource(null)}>
        <DialogContent className="w-screen h-screen max-w-none m-0 p-0 bg-white dark:bg-gray-900 border-none rounded-none flex flex-col">
          <DialogHeader className="p-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10 pt-[calc(0.5rem+env(safe-area-inset-top))]">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">{viewingResource?.name}</DialogTitle>
              <Button onClick={() => setViewingResource(null)} variant="ghost" size="sm" className="bg-gray-100 dark:bg-gray-800 rounded-full">Close</Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 pb-24 whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
            {viewingResource?.content}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResourcesPage;
