
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Book, Download, FileText, Video, Headphones, Users, Calendar, Heart } from "lucide-react";
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
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [showReadingPlans, setShowReadingPlans] = useState(false);
  const [showPrayerRequest, setShowPrayerRequest] = useState(false);
  const [resourceCategories, setResourceCategories] = useState<ResourceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDownload = async (itemName: string, category: string) => {
    try {
      // Record the download in the database
      const success = await ResourceService.recordDownload(
        itemName,
        category,
        ResourceService.getClientIP(),
        ResourceService.getUserAgent()
      );

      if (success) {
        // Update the download count in the UI
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
      }

      // Create a dummy file download
      const element = document.createElement("a");
      const file = new Blob([`${category}: ${itemName} - This is a sample document from The Power House International Church.`], {type: 'text/plain'});
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
            title: "Sermon Series",
            icon: <Video className="w-6 h-6" />,
            items: [
              { 
                name: "Faith Foundations", 
                description: "Building strong faith fundamentals", 
                downloads: downloadCounts["Sermon Series"]?.["Faith Foundations"] || 0 
              },
              { 
                name: "Walking in Purpose", 
                description: "Discovering God's calling", 
                downloads: downloadCounts["Sermon Series"]?.["Walking in Purpose"] || 0 
              },
              { 
                name: "Kingdom Living", 
                description: "Living as citizens of heaven", 
                downloads: downloadCounts["Sermon Series"]?.["Kingdom Living"] || 0 
              }
            ]
          },
          {
            title: "Study Guides",
            icon: <FileText className="w-6 h-6" />,
            items: [
              { 
                name: "New Testament Survey", 
                description: "Comprehensive NT overview", 
                downloads: downloadCounts["Study Guides"]?.["New Testament Survey"] || 0 
              },
              { 
                name: "Prayer & Fasting Guide", 
                description: "Spiritual discipline handbook", 
                downloads: downloadCounts["Study Guides"]?.["Prayer & Fasting Guide"] || 0 
              },
              { 
                name: "Financial Stewardship", 
                description: "Biblical money management", 
                downloads: downloadCounts["Study Guides"]?.["Financial Stewardship"] || 0 
              }
            ]
          },
          {
            title: "Audio Resources",
            icon: <Headphones className="w-6 h-6" />,
            items: [
              { 
                name: "Daily Devotionals", 
                description: "Morning inspiration podcasts", 
                downloads: downloadCounts["Audio Resources"]?.["Daily Devotionals"] || 0 
              },
              { 
                name: "Worship Playlists", 
                description: "Curated praise & worship", 
                downloads: downloadCounts["Audio Resources"]?.["Worship Playlists"] || 0 
              },
              { 
                name: "Teaching Archives", 
                description: "Past sermon recordings", 
                downloads: downloadCounts["Audio Resources"]?.["Teaching Archives"] || 0 
              }
            ]
          }
        ];

        setResourceCategories(initialCategories);
      } catch (error) {
        console.error('Error initializing resources:', error);
        // Fallback to default categories with 0 downloads
        setResourceCategories([
          {
            title: "Sermon Series",
            icon: <Video className="w-6 h-6" />,
            items: [
              { name: "Faith Foundations", description: "Building strong faith fundamentals", downloads: 0 },
              { name: "Walking in Purpose", description: "Discovering God's calling", downloads: 0 },
              { name: "Kingdom Living", description: "Living as citizens of heaven", downloads: 0 }
            ]
          },
          {
            title: "Study Guides",
            icon: <FileText className="w-6 h-6" />,
            items: [
              { name: "New Testament Survey", description: "Comprehensive NT overview", downloads: 0 },
              { name: "Prayer & Fasting Guide", description: "Spiritual discipline handbook", downloads: 0 },
              { name: "Financial Stewardship", description: "Biblical money management", downloads: 0 }
            ]
          },
          {
            title: "Audio Resources",
            icon: <Headphones className="w-6 h-6" />,
            items: [
              { name: "Daily Devotionals", description: "Morning inspiration podcasts", downloads: 0 },
              { name: "Worship Playlists", description: "Curated praise & worship", downloads: 0 },
              { name: "Teaching Archives", description: "Past sermon recordings", downloads: 0 }
            ]
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    initializeResources();
  }, []);

  const handleJoinLifeGroup = () => {
    navigate("/groups");
  };

  const handlePrayerRequest = () => {
    setShowPrayerRequest(true);
  };

  const handleEventCalendar = () => {
    navigate("/news");
  };

  const handleBibleReadingPlan = () => {
    setShowReadingPlans(true);
  };

  const quickActions = [
    { 
      title: "Join Life Group", 
      icon: <Users className="w-6 h-6" />, 
      description: "Connect with community", 
      color: "bg-blue-500",
      onClick: handleJoinLifeGroup
    },
    { 
      title: "Prayer Request", 
      icon: <Heart className="w-6 h-6" />, 
      description: "Submit prayer needs", 
      color: "bg-purple-500",
      onClick: handlePrayerRequest
    },
    { 
      title: "Event Calendar", 
      icon: <Calendar className="w-6 h-6" />, 
      description: "Upcoming events", 
      color: "bg-green-500",
      onClick: handleEventCalendar
    },
    { 
      title: "Bible Reading Plan", 
      icon: <Book className="w-6 h-6" />, 
      description: "Structured reading", 
      color: "bg-orange-500",
      onClick: handleBibleReadingPlan
    }
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Resources</h1>
        <p className="text-muted-foreground">Grow in faith with our spiritual resources</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {quickActions.map((action, index) => (
          <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={action.onClick}>
            <CardContent className="p-4 text-center">
              <div className={`${action.color} w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-white`}>
                {action.icon}
              </div>
              <h3 className="font-semibold text-sm mb-1">{action.title}</h3>
              <p className="text-xs text-foreground dark:text-white">{action.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Location Selector */}
      <div className="mb-8">
        <LocationSelector />
      </div>

      {/* Resource Categories */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resources...</p>
        </div>
      ) : (
        resourceCategories.map((category, index) => (
        <Card key={index} className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {category.icon}
              <span>{category.title}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {category.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex items-center justify-between p-4 bg-accent rounded-lg hover:bg-accent/80 transition-colors">
                  <div className="flex-1">
                                          <h4 className="font-semibold text-foreground dark:text-white">{item.name}</h4>
                    <p className="text-sm text-foreground dark:text-white">{item.description}</p>
                    <p className="text-xs text-muted-foreground dark:text-white mt-1">{item.downloads} downloads</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-4"
                    onClick={() => handleDownload(item.name, category.title)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                View All {category.title}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))
      )}

      {/* Featured Resource */}
      <Card className="border-0 shadow-lg bg-primary text-primary-foreground">
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-bold mb-2">Featured: 40 Days of Prayer</h3>
          <p className="mb-4 opacity-90">Join our church-wide prayer and fasting journey</p>
          <Button 
            variant="secondary" 
            className="bg-white text-primary hover:bg-gray-100"
            onClick={() => handleDownload("40 Days of Prayer", "Featured Resource")}
          >
            <Download className="w-4 h-4 mr-2" />
            Get Prayer Guide
          </Button>
        </CardContent>
      </Card>

      {/* Bible Reading Plans Dialog */}
      <Dialog open={showReadingPlans} onOpenChange={setShowReadingPlans}>
        <DialogContent className="max-w-4xl max-h-[80vh] mt-24 sm:mt-16 md:mt-20 lg:mt-24">
          <DialogHeader>
            <DialogTitle>Bible Reading Plans</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            <BibleReadingPlans />
          </div>
        </DialogContent>
      </Dialog>

      {/* Prayer Request Dialog */}
      <Dialog open={showPrayerRequest} onOpenChange={setShowPrayerRequest}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Prayer Request</DialogTitle>
          </DialogHeader>
          <PrayerRequestForm />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResourcesPage;
