import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Users, Clock, ChevronRight, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { readingPlanService, ReadingPlan } from "@/services/readingPlanService";

const BibleReadingPlansPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Find Plans");
  const [searchQuery, setSearchQuery] = useState("");
  const [enrolledPlans, setEnrolledPlans] = useState<string[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, number>>({});
  const [completedPlans, setCompletedPlans] = useState<string[]>([]);

  const tabs = ["My Plans", "Find Plans", "Saved", "Completed"];

  // Mock data for categories and featured plans
  const categories = [
    { name: "New", color: "bg-blue-100 text-blue-800" },
    { name: "Relationships", color: "bg-green-100 text-green-800" },
    { name: "Listen & Watch", color: "bg-purple-100 text-purple-800" },
    { name: "Grace", color: "bg-orange-100 text-orange-800" },
    { name: "Prayer", color: "bg-red-100 text-red-800" },
    { name: "Purpose", color: "bg-indigo-100 text-indigo-800" },
  ];

  const featuredPlan = {
    id: "genesis-explained",
    title: "Genesis Explained",
    subtitle: "Part 2 | the Journey Begins",
    image: "/api/placeholder/400/200",
    category: "New",
    participants: 1247
  };

  useEffect(() => {
    if (user) {
      fetchUserProgress();
    }
  }, [user]);

  const fetchUserProgress = async () => {
    if (!user) return;

    try {
      // For now, we'll use localStorage as a fallback until the database table is created
      const storedProgress = localStorage.getItem(`reading_plans_${user.id}`);
      if (storedProgress) {
        const parsedData = JSON.parse(storedProgress);
        setEnrolledPlans(parsedData.enrolled || []);
        setUserProgress(parsedData.progress || {});
        setCompletedPlans(parsedData.completed || []);
      }
    } catch (error) {
      console.error('Error fetching user progress:', error);
    }
  };

  const allPlans = readingPlanService.getAllPlans();
  const filteredPlans = allPlans.filter(plan => 
    plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPlansForTab = () => {
    switch (activeTab) {
      case "My Plans":
        return filteredPlans.filter(plan => enrolledPlans.includes(plan.id));
      case "Find Plans":
        return filteredPlans;
      case "Saved":
        return []; // Implement saved plans logic
      case "Completed":
        return filteredPlans.filter(plan => completedPlans.includes(plan.id));
      default:
        return filteredPlans;
    }
  };

  const handleStartPlan = async (planId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      // For now, we'll use localStorage as a fallback
      const newEnrolled = [...enrolledPlans, planId];
      const newProgress = { ...userProgress, [planId]: 1 };
      
      localStorage.setItem(`reading_plans_${user.id}`, JSON.stringify({
        enrolled: newEnrolled,
        progress: newProgress,
        completed: completedPlans
      }));
      
      setEnrolledPlans(newEnrolled);
      setUserProgress(newProgress);
    } catch (error) {
      console.error('Error starting plan:', error);
    }
  };

  const renderPlanCard = (plan: ReadingPlan) => {
    const isEnrolled = enrolledPlans.includes(plan.id);
    const progress = userProgress[plan.id] || 0;
    const progressPercentage = (progress / plan.totalDays) * 100;

    return (
      <Card key={plan.id} className="hover:shadow-lg transition-shadow">
        <CardContent className="p-0">
          <div className="flex">
            {/* Plan Image/Icon */}
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center rounded-l-lg">
              <span className="text-2xl font-bold text-primary">
                {plan.name.charAt(0)}
              </span>
            </div>
            
            {/* Plan Content */}
            <div className="flex-1 p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-lg leading-tight">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleStartPlan(plan.id)}
                  disabled={isEnrolled}
                  className="ml-4"
                >
                  {isEnrolled ? "Enrolled" : "Start"}
                </Button>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{plan.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{Math.floor(Math.random() * 1000)} participants</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>5.0</span>
                </div>
              </div>
              
              {isEnrolled && (
                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCategoryPlans = () => {
    const plansByCategory = categories.reduce((acc, category) => {
      const categoryPlans = filteredPlans.filter(plan => 
        plan.category.toLowerCase() === category.name.toLowerCase()
      );
      if (categoryPlans.length > 0) {
        acc[category.name] = categoryPlans.slice(0, 3); // Show max 3 per category
      }
      return acc;
    }, {} as Record<string, ReadingPlan[]>);

    return Object.entries(plansByCategory).map(([categoryName, plans]) => {
      const category = categories.find(c => c.name === categoryName);
      
      return (
        <div key={categoryName} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{categoryName}</h2>
            <Button variant="ghost" size="sm" className="text-primary">
              See all <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="space-y-4">
            {plans.map(renderPlanCard)}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/resources")}
                className="p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold">Plans</h1>
            </div>
            <Button variant="ghost" size="sm">
              <Search className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap ${
                  activeTab === tab 
                    ? "bg-foreground text-background" 
                    : "bg-background text-foreground hover:bg-muted"
                }`}
              >
                {tab}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {activeTab === "Find Plans" && (
          <>
            {/* Featured Plan */}
            <Card className="mb-6 overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  <div className="h-48 bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-3xl font-bold mb-2">Genesis</h2>
                      <h3 className="text-3xl font-bold">Explained</h3>
                      <Badge className="mt-4 bg-orange-500 text-white">PART 2</Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg">Genesis Explained Part 2 | the Journey Begins</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>1 participant</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {categories.map((category) => (
                <Badge
                  key={category.name}
                  variant="outline"
                  className={`whitespace-nowrap cursor-pointer hover:opacity-80 ${category.color}`}
                >
                  {category.name}
                </Badge>
              ))}
            </div>

            {/* Category Sections */}
            {renderCategoryPlans()}
          </>
        )}

        {activeTab !== "Find Plans" && (
          <>
            {/* Search */}
            <div className="mb-6">
              <Input
                placeholder="Search reading plans..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Plans List */}
            <div className="space-y-4">
              {getPlansForTab().length > 0 ? (
                getPlansForTab().map(renderPlanCard)
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {activeTab === "My Plans" && "You haven't enrolled in any plans yet."}
                    {activeTab === "Saved" && "No saved plans."}
                    {activeTab === "Completed" && "No completed plans yet."}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BibleReadingPlansPage;