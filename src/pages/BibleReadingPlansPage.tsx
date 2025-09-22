import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Users, Clock, ChevronRight, ArrowLeft, X, BookOpen, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { readingPlanService, ReadingPlan } from "@/services/readingPlanService";
import { useToast } from "@/hooks/use-toast";

const BibleReadingPlansPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("Find Plans");
  const [searchQuery, setSearchQuery] = useState("");
  const [enrolledPlans, setEnrolledPlans] = useState<string[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, number>>({});
  const [completedPlans, setCompletedPlans] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<ReadingPlan | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [planParticipants, setPlanParticipants] = useState<Record<string, number>>({});

  const tabs = ["My Plans", "Find Plans", "Saved", "Completed"];

  // Categories based on reading plan difficulty levels
  const categories = [
    { name: "Beginner", color: "bg-green-100 text-green-800" },
    { name: "Intermediate", color: "bg-blue-100 text-blue-800" },
    { name: "Advanced", color: "bg-purple-100 text-purple-800" },
    { name: "Wisdom", color: "bg-orange-100 text-orange-800" },
    { name: "Gospels", color: "bg-red-100 text-red-800" },
    { name: "Letters", color: "bg-indigo-100 text-indigo-800" },
  ];
  
  const allPlans = readingPlanService.getAllPlans();
  // Get featured plan (Bible in a Year)
  const featuredPlan = allPlans.find(plan => plan.id === "bible-year");

  useEffect(() => {
    if (user) {
      fetchUserProgress();
    }
    initializePlanParticipants();
  }, [user]);

  const initializePlanParticipants = () => {
    const participants: Record<string, number> = {};
    allPlans.forEach(plan => {
      const stored = localStorage.getItem(`plan_participants_${plan.id}`);
      participants[plan.id] = stored ? parseInt(stored) : 0;
    });
    setPlanParticipants(participants);
  };

  const fetchUserProgress = async () => {
    if (!user) return;

    try {
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

  const handlePlanClick = (planId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const plan = readingPlanService.getPlanById(planId);
    if (plan) {
      setSelectedPlan(plan);
      setShowStartModal(true);
    }
  };

  const handleStartPlan = async (planId: string) => {
    try {
      // For now, we'll use localStorage as a fallback
      const newEnrolled = [...enrolledPlans, planId];
      const newProgress = { ...userProgress, [planId]: 1 };
      
      // Increment participant count
      const currentCount = planParticipants[planId] || 0;
      const newCount = currentCount + 1;
      const newParticipants = { ...planParticipants, [planId]: newCount };
      
      localStorage.setItem(`reading_plans_${user.id}`, JSON.stringify({
        enrolled: newEnrolled,
        progress: newProgress,
        completed: completedPlans
      }));
      
      localStorage.setItem(`plan_participants_${planId}`, newCount.toString());
      
      setEnrolledPlans(newEnrolled);
      setUserProgress(newProgress);
      setPlanParticipants(newParticipants);
      // Don't close modal - keep it open for progress tracking
      
      toast({
        title: "Plan Started!",
        description: `You've enrolled in ${readingPlanService.getPlanById(planId)?.name}`,
      });
    } catch (error) {
      console.error('Error starting plan:', error);
      toast({
        title: "Error",
        description: "Failed to start the reading plan. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleStopPlan = async (planId: string) => {
    try {
      const newEnrolled = enrolledPlans.filter(id => id !== planId);
      const newProgress = { ...userProgress };
      delete newProgress[planId];
      
      // Decrement participant count
      const currentCount = planParticipants[planId] || 0;
      const newCount = Math.max(0, currentCount - 1);
      const newParticipants = { ...planParticipants, [planId]: newCount };
      
      localStorage.setItem(`reading_plans_${user?.id}`, JSON.stringify({
        enrolled: newEnrolled,
        progress: newProgress,
        completed: completedPlans
      }));
      
      localStorage.setItem(`plan_participants_${planId}`, newCount.toString());
      
      setEnrolledPlans(newEnrolled);
      setUserProgress(newProgress);
      setPlanParticipants(newParticipants);
      
      toast({
        title: "Plan Stopped",
        description: `You've left ${readingPlanService.getPlanById(planId)?.name}`,
      });
    } catch (error) {
      console.error('Error stopping plan:', error);
      toast({
        title: "Error",
        description: "Failed to stop the reading plan. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReadToday = (planId: string) => {
    const plan = readingPlanService.getPlanById(planId);
    const currentDay = userProgress[planId] || 1;
    const todaysReading = readingPlanService.getTodaysReading(planId, currentDay);
    
    if (todaysReading && todaysReading.readings.length > 0) {
      // Navigate to Bible page with the first reading
      const firstReading = todaysReading.readings[0];
      const [book, chapters] = firstReading.split(' ');
      const chapter = chapters ? chapters.split('-')[0] : '1';
      
      navigate(`/bible?book=${encodeURIComponent(book)}&chapter=${chapter}`);
    }
  };

  const markDayComplete = (planId: string) => {
    const currentDay = userProgress[planId] || 1;
    const plan = readingPlanService.getPlanById(planId);
    
    if (!plan) return;
    
    const newDay = currentDay + 1;
    const newProgress = { ...userProgress, [planId]: newDay };
    
    // Check if plan is completed
    if (newDay > plan.totalDays) {
      const newCompleted = [...completedPlans, planId];
      setCompletedPlans(newCompleted);
      
      localStorage.setItem(`reading_plans_${user?.id}`, JSON.stringify({
        enrolled: enrolledPlans,
        progress: newProgress,
        completed: newCompleted
      }));
      
      toast({
        title: "🎉 Plan Completed!",
        description: `Congratulations! You've completed ${plan.name}. ${plan.reward}`,
      });
    } else {
      setUserProgress(newProgress);
      
      localStorage.setItem(`reading_plans_${user?.id}`, JSON.stringify({
        enrolled: enrolledPlans,
        progress: newProgress,
        completed: completedPlans
      }));
      
      toast({
        title: "Day Complete!",
        description: `Great job! You're on day ${newDay} of ${plan.totalDays}.`,
      });
    }
  };

  const getPlanIntroduction = (planId: string): string => {
    switch (planId) {
      case "bible-year":
        return "Embark on a transformative year-long journey through the entire Bible. This comprehensive plan will take you through both Old and New Testaments, giving you a complete overview of God's word. Perfect for building a strong foundation in Biblical knowledge.";
      case "psalms-proverbs":
        return "Dive deep into the wisdom literature of the Bible. This plan focuses on the Psalms for worship and praise, and Proverbs for practical daily wisdom. Ideal for daily inspiration and guidance in your spiritual walk.";
      case "new-testament":
        return "Focus on the life, teachings, and early church described in the New Testament. This plan will take you through the Gospels, Acts, Epistles, and Revelation, providing insight into Christian living and doctrine.";
      case "four-gospels":
        return "Experience the life and teachings of Jesus Christ through the four different perspectives of Matthew, Mark, Luke, and John. Each Gospel offers unique insights into the Savior's ministry and message.";
      case "major-prophets":
        return "Explore the powerful messages of God's major prophets: Isaiah, Jeremiah, Lamentations, Ezekiel, and Daniel. These books contain some of the most profound prophecies and spiritual insights in Scripture.";
      case "pauls-letters":
        return "Study the theological foundations of Christianity through the Apostle Paul's letters. From Romans to Philemon, discover the deep truths about salvation, Christian living, and church doctrine.";
      default:
        return "Begin your journey through this carefully selected portion of Scripture designed to strengthen your faith and deepen your understanding of God's word.";
    }
  };

  const renderPlanCard = (plan: ReadingPlan) => {
    const isEnrolled = enrolledPlans.includes(plan.id);
    const isCompleted = completedPlans.includes(plan.id);
    const progress = userProgress[plan.id] || 0;
    const progressPercentage = (progress / plan.totalDays) * 100;
    const currentDay = progress;
    const todaysReading = readingPlanService.getTodaysReading(plan.id, currentDay);

    const getCategoryColor = (category: string) => {
      switch (category) {
        case "beginner": return "bg-green-100 text-green-800";
        case "intermediate": return "bg-blue-100 text-blue-800";
        case "advanced": return "bg-purple-100 text-purple-800";
        default: return "bg-gray-100 text-gray-800";
      }
    };

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
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg leading-tight">{plan.name}</h3>
                    <Badge className={getCategoryColor(plan.category)} variant="outline">
                      {plan.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:ml-4 w-full sm:w-auto">
                  {!isEnrolled && !isCompleted && (
                    <Button 
                      size="sm" 
                      onClick={() => handlePlanClick(plan.id)}
                      className="w-full sm:w-auto"
                    >
                      Start
                    </Button>
                  )}
                  
                  {isEnrolled && !isCompleted && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleReadToday(plan.id)}
                        className="w-full sm:w-auto text-xs"
                      >
                        Read Today
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => markDayComplete(plan.id)}
                        className="w-full sm:w-auto text-xs"
                      >
                        Mark Complete
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleStopPlan(plan.id)}
                        className="w-full sm:w-auto text-xs"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Stop Plan
                      </Button>
                    </div>
                  )}
                  
                  {isCompleted && (
                    <Badge className="bg-green-100 text-green-800">
                      ✓ Completed
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{plan.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{planParticipants[plan.id] || 0} participants</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>5.0</span>
                </div>
              </div>
              
              {isEnrolled && !isCompleted && todaysReading && (
                <div className="mt-3">
                  <div className="text-sm text-muted-foreground mb-2">
                    <strong>Today's Reading (Day {currentDay}):</strong> {todaysReading.readings.join(", ")}
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progressPercentage)}% ({currentDay}/{plan.totalDays} days)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all" 
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {isCompleted && (
                <div className="mt-3 p-2 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    🎉 Completed! {plan.reward}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCategoryPlans = () => {
    const plansByCategory = {
      "Beginner": allPlans.filter(plan => plan.category === "beginner"),
      "Intermediate": allPlans.filter(plan => plan.category === "intermediate"), 
      "Advanced": allPlans.filter(plan => plan.category === "advanced")
    };

    return Object.entries(plansByCategory).map(([categoryName, plans]) => {
      if (plans.length === 0) return null;
      
      return (
        <div key={categoryName} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{categoryName} Plans</h2>
            <Button variant="ghost" size="sm" className="text-primary">
              See all <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="space-y-4">
            {plans.map(renderPlanCard)}
          </div>
        </div>
      );
    }).filter(Boolean);
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

      {/* Start Plan Modal */}
      <Dialog open={showStartModal} onOpenChange={setShowStartModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-0 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              Start Reading Plan
            </DialogTitle>
            <DialogDescription>
              Review the plan details before starting your journey
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 pt-4">
          
          {selectedPlan && (
            <div className="space-y-6">
              {/* Plan Introduction */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg">
                <h3 className="text-xl font-bold mb-2">{selectedPlan.name}</h3>
                <p className="text-muted-foreground mb-3">{selectedPlan.description}</p>
                
                <div className="bg-background/50 p-3 rounded-lg mb-3">
                  <h4 className="font-semibold text-sm mb-2">About This Plan:</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {getPlanIntroduction(selectedPlan.id)}
                  </p>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{selectedPlan.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{selectedPlan.totalDays} days</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{planParticipants[selectedPlan.id] || 0} participants</span>
                  </div>
                  <Badge className="ml-auto">
                    {selectedPlan.category}
                  </Badge>
                </div>
              </div>

              {/* Plan Status & Progress */}
              {(() => {
                const isEnrolled = enrolledPlans.includes(selectedPlan.id);
                const isCompleted = completedPlans.includes(selectedPlan.id);
                const currentDay = userProgress[selectedPlan.id] || 1;
                const progressPercentage = isEnrolled ? (currentDay / selectedPlan.totalDays) * 100 : 0;
                const todaysReading = readingPlanService.getTodaysReading(selectedPlan.id, isEnrolled ? currentDay : 1);

                if (isCompleted) {
                  return (
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <h4 className="text-lg font-bold text-green-800 mb-2">🎉 Plan Completed!</h4>
                      <p className="text-green-700">{selectedPlan.reward}</p>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowStartModal(false)}
                        className="mt-3"
                      >
                        Close
                      </Button>
                    </div>
                  );
                }

                if (isEnrolled) {
                  return (
                    <div className="space-y-4">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium">Your Progress</span>
                          <span>{Math.round(progressPercentage)}% ({currentDay}/{selectedPlan.totalDays} days)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-primary h-3 rounded-full transition-all duration-300" 
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Today's Reading */}
                      {todaysReading && (
                        <div className="bg-muted p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Day {currentDay} Reading:
                          </h4>
                          <p className="text-sm mb-3">{todaysReading.readings.join(", ")}</p>
                          {todaysReading.description && (
                            <p className="text-xs text-muted-foreground mb-3">{todaysReading.description}</p>
                          )}
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                handleReadToday(selectedPlan.id);
                                setShowStartModal(false);
                              }}
                              className="flex-1"
                            >
                              Read Now
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => markDayComplete(selectedPlan.id)}
                              className="flex-1"
                            >
                              Mark Complete
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Plan Management */}
                      <div className="flex gap-3 pt-2">
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            handleStopPlan(selectedPlan.id);
                            setShowStartModal(false);
                          }}
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Stop Plan
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowStartModal(false)}
                          className="flex-1"
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  );
                }

                // Not enrolled yet
                return (
                  <div className="space-y-4">
                    {/* Preview Reading */}
                    {todaysReading && (
                      <div>
                        <h4 className="font-semibold mb-2">Day 1 Reading Preview:</h4>
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm">{todaysReading.readings.join(", ")}</p>
                          {todaysReading.description && (
                            <p className="text-xs text-muted-foreground mt-1">{todaysReading.description}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Plan Reward */}
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Completion Reward:</strong> {selectedPlan.reward}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowStartModal(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => handleStartPlan(selectedPlan.id)}
                        className="flex-1"
                      >
                        Start This Plan
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BibleReadingPlansPage;