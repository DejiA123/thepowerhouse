
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Bell,
  Heart,
  Book,
  Users,
  UserPlus,
  Search,
  Menu,
  User,
  Video,
  Headphones,
  MapPin,
  MessageSquare,
  Award,
  Settings
} from "lucide-react";
import DailyScripture from "./DailyScripture";
import EventCountdown from "./EventCountdown";
import MediaLibrary from "./MediaLibrary";
import AnnouncementsHub from "./AnnouncementsHub";
import GivingPortal from "./GivingPortal";
import DepartmentsHub from "./DepartmentsHub";
import BibleReader from "./BibleReader";

interface DashboardProps {
  userRole: 'member' | 'worker' | 'pastor' | 'admin';
  onLogout: () => void;
}

const Dashboard = ({ userRole, onLogout }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState("home");

  console.log("Dashboard rendered, activeTab:", activeTab);

  const getRoleColor = (role: string) => {
    const colors = {
      member: "bg-blue-100 text-blue-800",
      worker: "bg-green-100 text-green-800",
      pastor: "bg-purple-100 text-purple-800",
      admin: "bg-red-100 text-red-800"
    };
    return colors[role as keyof typeof colors] || colors.member;
  };

  const topicCards = [
    { title: "Love", gradient: "from-pink-500 to-red-500" },
    { title: "Faith", gradient: "from-blue-500 to-indigo-600" },
    { title: "Hope", gradient: "from-green-500 to-emerald-600" },
    { title: "Prayer", gradient: "from-purple-500 to-violet-600" }
  ];

  const handleBibleClick = () => {
    console.log("Bible button clicked, switching to bible tab");
    setActiveTab("bible");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-foreground">
                The Power House
              </h1>
              <Badge className={getRoleColor(userRole)}>
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Search className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <User className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="sm" onClick={onLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-8 mb-8 bg-blue-50">
            <TabsTrigger value="home" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Home</TabsTrigger>
            <TabsTrigger value="media" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Media</TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">News</TabsTrigger>
            <TabsTrigger value="giving" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Giving</TabsTrigger>
            <TabsTrigger value="departments" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Groups</TabsTrigger>
            <TabsTrigger value="outreach" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Outreach</TabsTrigger>
            <TabsTrigger value="prayer" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Prayer</TabsTrigger>
            <TabsTrigger value="bible" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Bible</TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="space-y-6">
            {/* Topic Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {topicCards.map((topic, index) => (
                <Card key={index} className="border-0 shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow">
                  <div className={`bg-gradient-to-br ${topic.gradient} h-24 flex items-center justify-center`}>
                    <h3 className="text-white text-lg font-semibold">{topic.title}</h3>
                  </div>
                </Card>
              ))}
            </div>

            {/* Daily Scripture */}
            <DailyScripture />

            <div className="grid md:grid-cols-2 gap-6">
              {/* Event Countdown */}
              <EventCountdown />

              {/* Quick Actions */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-20 flex-col space-y-2 border-blue-200 hover:bg-blue-50"
                      onClick={() => setActiveTab("giving")}
                    >
                      <Heart className="w-6 h-6 text-blue-600" />
                      <span>Give</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex-col space-y-2 border-blue-200 hover:bg-blue-50"
                      onClick={() => setActiveTab("prayer")}
                    >
                      <MessageSquare className="w-6 h-6 text-blue-600" />
                      <span>Prayer Wall</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex-col space-y-2 border-blue-200 hover:bg-blue-50"
                      onClick={() => setActiveTab("departments")}
                    >
                      <Users className="w-6 h-6 text-blue-600" />
                      <span>Join Ministry</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex-col space-y-2 border-blue-200 hover:bg-blue-50"
                      onClick={handleBibleClick}
                    >
                      <Book className="w-6 h-6 text-blue-600" />
                      <span>Read Bible</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="media">
            <MediaLibrary />
          </TabsContent>

          <TabsContent value="announcements">
            <AnnouncementsHub />
          </TabsContent>

          <TabsContent value="giving">
            <GivingPortal />
          </TabsContent>

          <TabsContent value="departments">
            <DepartmentsHub />
          </TabsContent>

          <TabsContent value="outreach">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-green-500" />
                  <span>Campus Outreach Hub</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">Connect with campus fellowships and outreach programs</p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {['UoG Fellowship', 'ATU Campus', 'Maynooth Connect', 'South Fellowship', 'TUS Campus'].map((campus) => (
                    <Card key={campus} className="border border-blue-100">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <MapPin className="w-5 h-5 text-blue-600" />
                          <h3 className="font-medium">{campus}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">Weekly fellowship meetings every Thursday 7:00 PM</p>
                        <div className="space-y-2">
                          <Button variant="outline" size="sm" className="w-full">
                            View Details
                          </Button>
                          <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                            Join Fellowship
                          </Button>
                        </div>
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground">Soul-winning count: 15 this month</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full w-3/4"></div>
                            </div>
                            <span className="text-xs">75%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prayer">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-purple-500" />
                  <span>Prayer Wall</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    Submit Prayer Request
                  </Button>
                </div>

                <div className="space-y-4">
                  {[
                    { id: 1, request: "Please pray for my upcoming job interview", author: "Anonymous", prayers: 23, date: "2 hours ago" },
                    { id: 2, request: "Healing for my grandmother who is in the hospital", author: "Sarah M.", prayers: 45, date: "5 hours ago" },
                    { id: 3, request: "Wisdom in choosing the right university course", author: "John D.", prayers: 12, date: "1 day ago" }
                  ].map((prayer) => (
                    <div key={prayer.id} className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                      <p className="mb-3">{prayer.request}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground dark:text-black">By {prayer.author} • {prayer.date}</span>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" className="text-purple-600">
                            🙏 {prayer.prayers} praying
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-100">
                  <h3 className="font-medium text-green-800 mb-2">This Week's Testimonies</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-green-700">"God provided the exact amount I needed for school fees!" - Mary K.</p>
                    <p className="text-sm text-green-700">"My father was healed after we prayed together!" - James L.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bible">
            <BibleReader />
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-2 left-0 right-0 bg-white border-t border-border p-4 lg:hidden shadow-lg rounded-lg mx-2">
        <div className="flex justify-around">
          <button
            className="text-center"
            onClick={() => setActiveTab("home")}
          >
            <Calendar className={`w-6 h-6 mx-auto mb-1 ${activeTab === "home" ? "text-blue-600" : "text-muted-foreground"}`} />
            <span className={`text-xs ${activeTab === "home" ? "text-blue-600 font-medium" : "text-muted-foreground"}`}>Home</span>
          </button>
          <button
            className="text-center"
            onClick={handleBibleClick}
          >
            <Book className={`w-6 h-6 mx-auto mb-1 ${activeTab === "bible" ? "text-blue-600" : "text-muted-foreground"}`} />
            <span className={`text-xs ${activeTab === "bible" ? "text-blue-600 font-medium" : "text-muted-foreground"}`}>Bible</span>
          </button>
          <button
            className="text-center"
            onClick={() => setActiveTab("announcements")}
          >
            <Bell className={`w-6 h-6 mx-auto mb-1 ${activeTab === "announcements" ? "text-blue-600" : "text-muted-foreground"}`} />
            <span className={`text-xs ${activeTab === "announcements" ? "text-blue-600 font-medium" : "text-muted-foreground"}`}>News</span>
          </button>
          <button
            className="text-center"
            onClick={() => setActiveTab("departments")}
          >
            <Users className={`w-6 h-6 mx-auto mb-1 ${activeTab === "departments" ? "text-blue-600" : "text-muted-foreground"}`} />
            <span className={`text-xs ${activeTab === "departments" ? "text-blue-600 font-medium" : "text-muted-foreground"}`}>Groups</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
