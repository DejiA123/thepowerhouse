import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Users, BookOpen, Target, CheckCircle, Trophy, Gift, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { readingPlanService, type ReadingPlan, type DailyReading } from "@/services/readingPlanService";
import { useNavigate } from "react-router-dom";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";

// Bible Reading Plans component with daily scripture generation
const BibleReadingPlans = () => {
  const [enrolledPlans, setEnrolledPlans] = useState<string[]>([]);
  const [planProgress, setPlanProgress] = useState<Record<string, any>>({});
  const [completedPlans, setCompletedPlans] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { updatePreferences } = useBiblePreferences();

  const readingPlans = readingPlanService.getAllPlans();

  useEffect(() => {
    if (user) {
      fetchUserProgress();
    }
  }, [user]);

  const fetchUserProgress = async () => {
    const { data, error } = await supabase
      .from('reading_plan_progress')
      .select('*')
      .eq('user_id', user?.id);

    if (data) {
      const progressMap = data.reduce((acc, progress) => {
        acc[progress.plan_id] = progress;
        return acc;
      }, {});
      setPlanProgress(progressMap);
      setEnrolledPlans(data.map(p => p.plan_id));
      
      // Check for completed plans
      const completed = data.filter(p => {
        const plan = readingPlans.find(rp => rp.id === p.plan_id);
        return plan && (p.completed_days?.length || 0) >= plan.totalDays;
      }).map(p => p.plan_id);
      setCompletedPlans(completed);
    }
  };

  const getTodaysReading = (planId: string) => {
    const progress = planProgress[planId];
    let currentDay = progress?.current_day || 1;
    if (!currentDay || currentDay < 1) currentDay = 1;
    
    const todaysReading = readingPlanService.getTodaysReading(planId, currentDay);
    return todaysReading?.readings || ["Reading not available"];
  };

  const getCurrentDay = (planId: string) => {
    const progress = planProgress[planId];
    let currentDay = progress?.current_day || 1;
    if (!currentDay || currentDay < 1) currentDay = 1;
    return currentDay;
  };

  const handleEnrollPlan = async (planId: string) => {
    if (!user) return;

    if (enrolledPlans.includes(planId)) {
      const { error } = await supabase
        .from('reading_plan_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('plan_id', planId);

      if (!error) {
        setEnrolledPlans(enrolledPlans.filter(id => id !== planId));
        const newProgress = { ...planProgress };
        delete newProgress[planId];
        setPlanProgress(newProgress);
        toast({ title: "Plan Unenrolled", description: "You have left this reading plan" });
      }
    } else {
      const { error } = await supabase
        .from('reading_plan_progress')
        .insert({
          user_id: user.id,
          plan_id: planId,
          current_day: 1
        });

      if (!error) {
        setEnrolledPlans([...enrolledPlans, planId]);
        fetchUserProgress();
        const plan = readingPlans.find(p => p.id === planId);
        toast({ title: "Plan Enrolled!", description: `You've joined ${plan?.name}. Start reading today!` });
      }
    }
  };

  const markDayComplete = async (planId: string, day: number) => {
    if (!user) return;

    const progress = planProgress[planId];
    const completedDays = progress?.completed_days || [];
    const newCompletedDays = [...completedDays, day.toString()];
    const nextDay = day + 1;

    const { error } = await supabase
      .from('reading_plan_progress')
      .update({
        completed_days: newCompletedDays,
        current_day: nextDay
      })
      .eq('user_id', user.id)
      .eq('plan_id', planId);

    if (!error) {
      fetchUserProgress();
      toast({ title: "Progress Updated!", description: `Day ${day} marked as complete` });
      
      // Check if plan is completed
      const plan = readingPlans.find(p => p.id === planId);
      if (plan && newCompletedDays.length >= plan.totalDays) {
        toast({ 
          title: "🎉 Plan Completed!", 
          description: `Congratulations! You've earned: ${plan.reward}`,
        });
      }
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "beginner": return "bg-green-100 text-green-800";
      case "intermediate": return "bg-blue-100 text-blue-800";
      case "advanced": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "beginner": return <BookOpen className="w-4 h-4" />;
      case "intermediate": return <Target className="w-4 h-4" />;
      case "advanced": return <CheckCircle className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  // Open today's reading in Bible page
  const openTodaysReading = (planId: string) => {
    const currentDay = getCurrentDay(planId);
    const todaysReading = readingPlanService.getTodaysReading(planId, currentDay);
    
    if (!todaysReading || !todaysReading.readings.length) {
      toast({
        title: "No Reading Available",
        description: "Unable to find today's reading for this plan.",
        variant: "destructive"
      });
      return;
    }

    // Parse the first reading to extract book and chapter
    const firstReading = todaysReading.readings[0];
    // Match patterns like "Genesis 1", "1 Chronicles 5", "1John 2", etc.
    const match = firstReading.match(/^(\d*\s*\w+)\s+(\d+)/);
    
    if (match) {
      let book = match[1].trim().toLowerCase();
      const chapter = parseInt(match[2]);
      
      // Handle books with numbers and spaces
      book = book.replace(/\s+/g, ''); // Remove spaces for consistency
      
      // Update Bible preferences and navigate
      updatePreferences({
        preferredBook: book,
        preferredChapter: chapter
      });

      navigate('/bible');
      
      toast({
        title: "Opening Today's Reading",
        description: `${match[1]} Chapter ${chapter}`,
      });
    } else {
      toast({
        title: "Invalid Reading Format",
        description: "Unable to parse today's reading. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Open specific reading in Bible page
  const openSpecificReading = (reading: string) => {
    // Match patterns like "Genesis 1", "1 Chronicles 5", "1John 2", etc.
    const match = reading.match(/^(\d*\s*\w+)\s+(\d+)/);
    
    if (match) {
      let book = match[1].trim().toLowerCase();
      const chapter = parseInt(match[2]);
      
      // Handle books with numbers and spaces
      book = book.replace(/\s+/g, ''); // Remove spaces for consistency
      
      // Update Bible preferences and navigate
      updatePreferences({
        preferredBook: book,
        preferredChapter: chapter
      });

      navigate('/bible');
      
      toast({
        title: "Opening Reading",
        description: `${match[1]} Chapter ${chapter}`,
      });
    } else {
      toast({
        title: "Invalid Reading Format",
        description: "Unable to parse this reading. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Bible Reading Plans</h2>
        <p className="text-muted-foreground">Choose a reading plan that fits your spiritual journey</p>
      </div>

      {/* Completed Plans Rewards */}
      {completedPlans.length > 0 && (
        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-yellow-800">
              <Trophy className="w-5 h-5" />
              <span>Your Achievements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedPlans.map(planId => {
                const plan = readingPlans.find(p => p.id === planId);
                return (
                  <div key={planId} className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                    <Gift className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">{plan?.name}</p>
                      <p className="text-sm text-yellow-600">{plan?.reward}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {readingPlans.map((plan) => {
          const isEnrolled = enrolledPlans.includes(plan.id);
          const isCompleted = completedPlans.includes(plan.id);
          const userProgress = planProgress[plan.id];
          const currentDay = getCurrentDay(plan.id);
          const completedDays = userProgress?.completed_days || [];
          const progress = (completedDays.length / plan.totalDays) * 100;
          
          // Add mock participants data for display
          const participants = {
            "bible-year": 1234,
            "psalms-proverbs": 567,
            "new-testament": 298,
            "gospels": 445,
            "prophets": 156,
            "epistles": 324
          }[plan.id] || 100;
          
          return (
            <Card key={plan.id} className={`${isEnrolled ? 'ring-2 ring-primary' : ''} ${isCompleted ? 'bg-green-50 border-green-200' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <Badge className={getCategoryColor(plan.category)}>
                        {getCategoryIcon(plan.category)}
                        <span className="ml-1 capitalize">{plan.category}</span>
                      </Badge>
                      {isEnrolled && <Badge variant="default">Enrolled</Badge>}
                      {isCompleted && <Badge className="bg-green-600 text-white">Completed ✓</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-2">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{plan.duration}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{participants} participants</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <Trophy className="w-3 h-3 text-yellow-600" />
                      <span className="text-yellow-700 font-medium">Reward: {plan.reward}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEnrolled && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Progress: Day {currentDay} of {plan.totalDays}</span>
                      <span>{Math.round(progress)}% complete</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {(isEnrolled || currentDay > 0) && (
                  <div className="bg-accent p-3 rounded-lg mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">
                        {isEnrolled ? "Today's Reading" : "Sample Reading"}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {isEnrolled ? (
                        getTodaysReading(plan.id).map((reading, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                            <span className="text-sm text-foreground">{reading}</span>
                            <Button
                              size="sm"
                              onClick={() => openSpecificReading(reading)}
                              className="ml-2"
                            >
                              <ArrowRight className="w-3 h-3 mr-1" />
                              Read Now
                            </Button>
                          </div>
                        ))
                      ) : (
                        // Show sample reading for non-enrolled plans
                        (() => {
                          const sampleReading = readingPlanService.getTodaysReading(plan.id, 1);
                          return sampleReading?.readings.map((reading, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                              <span className="text-sm text-foreground">{reading}</span>
                              <Button
                                size="sm"
                                onClick={() => openSpecificReading(reading)}
                                className="ml-2"
                              >
                                <ArrowRight className="w-3 h-3 mr-1" />
                                Read Now
                              </Button>
                            </div>
                          )) || ["Sample reading not available"];
                        })()
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={() => handleEnrollPlan(plan.id)}
                    variant={isEnrolled ? "outline" : "default"}
                    className="flex-1"
                    disabled={isCompleted}
                  >
                    {isCompleted ? "Completed" : isEnrolled ? "Leave Plan" : "Join Plan"}
                  </Button>
                  {isEnrolled && !isCompleted && (
                    <Button 
                      variant="outline"
                      onClick={() => markDayComplete(plan.id, currentDay)}
                      disabled={completedDays.includes(currentDay.toString())}
                      className="flex-1 sm:flex-none"
                    >
                      Mark Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-bold mb-2">Start Your Bible Journey Today</h3>
          <p className="mb-4 opacity-90">Join thousands of believers reading God's Word together</p>
          <div className="flex justify-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{readingPlans.reduce((sum, plan) => sum + ({
                "bible-year": 1234,
                "psalms-proverbs": 567,
                "new-testament": 298,
                "gospels": 445,
                "prophets": 156,
                "epistles": 324
              }[plan.id] || 100), 0)} participants</span>
            </div>
            <div className="flex items-center space-x-1">
              <BookOpen className="w-4 h-4" />
              <span>{readingPlans.length} plans available</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BibleReadingPlans;
