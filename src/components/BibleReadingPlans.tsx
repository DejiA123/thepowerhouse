
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BookOpen, Target, Heart, CheckCircle, ChevronRight, ChevronLeft, X, Loader2, ArrowRight, Share2, Users, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { readingPlanService, type ReadingPlan } from "@/services/readingPlanService";
import { enhancedApiBibleService } from "@/services/enhancedApiBibleService";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
import { normalizeBookApiName } from "./bible/bookUtils";

// --- Types ---
type ReadingModeStep = 'intro' | 'devotional' | 'scripture' | 'outro';

const BibleReadingPlans = () => {
  const [enrolledPlans, setEnrolledPlans] = useState<string[]>([]);
  const [planProgress, setPlanProgress] = useState<Record<string, any>>({});
  const [completedPlans, setCompletedPlans] = useState<string[]>([]);

  // UI State
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null); // For detail view
  const [activeReadingPlan, setActiveReadingPlan] = useState<string | null>(null); // For reading mode
  const [readingStep, setReadingStep] = useState<ReadingModeStep>('intro');

  // Inline Scripture State
  const [scriptureContent, setScriptureContent] = useState<{ ref: string, text: string[] }[]>([]);
  const [isLoadingScripture, setIsLoadingScripture] = useState(false);
  const [activeScriptureIndex, setActiveScriptureIndex] = useState(0);

  const { user } = useAuth();
  const { toast } = useToast();
  const { preferences } = useBiblePreferences(); // To get preferred translation
  const navigate = useNavigate();

  const readingPlans = readingPlanService.getAllPlans();
  const selectedPlan = readingPlans.find(p => p.id === selectedPlanId);
  const activePlan = readingPlans.find(p => p.id === activeReadingPlan);

  useEffect(() => {
    if (user) {
      fetchUserProgress();
    }
  }, [user]);

  // Fetch scripture when entering scripture step
  useEffect(() => {
    if (readingStep === 'scripture' && activePlan) {
      fetchDailyScripture();
    }
  }, [readingStep, activePlan]);

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

      const completed = data.filter(p => {
        const plan = readingPlans.find(rp => rp.id === p.plan_id);
        return plan && (p.completed_days?.length || 0) >= plan.totalDays;
      }).map(p => p.plan_id);
      setCompletedPlans(completed);
    }
  };

  const getPlanGradient = (category: string) => {
    switch (category) {
      case "beginner": return "from-emerald-400 to-teal-600";
      case "intermediate": return "from-blue-500 to-indigo-600";
      case "advanced": return "from-purple-500 to-pink-600";
      default: return "from-gray-500 to-slate-600";
    }
  };

  const getCurrentDay = (planId: string) => {
    const progress = planProgress[planId];
    let currentDay = progress?.current_day || 1;
    if (!currentDay || currentDay < 1) currentDay = 1;
    return currentDay;
  };

  const handleEnrollPlan = async (planId: string) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to join plans." });
      return;
    }

    if (enrolledPlans.includes(planId)) {
      setSelectedPlanId(null);
      startReading(planId); // If enrolled, just start reading
      return;
    }

    const { error } = await supabase
      .from('reading_plan_progress')
      .insert({ user_id: user.id, plan_id: planId, current_day: 1 });

    if (!error) {
      setEnrolledPlans([...enrolledPlans, planId]);
      fetchUserProgress();
      toast({ title: "Plan Joined!", description: "Added to My Plans." });
      setSelectedPlanId(null);
    }
  };

  const startReading = (planId: string) => {
    setActiveReadingPlan(planId);
    setReadingStep('intro');
    setScriptureContent([]); // Reset previous content
    setActiveScriptureIndex(0);
  };

  const fetchDailyScripture = async () => {
    if (!activePlan) return;
    setIsLoadingScripture(true);

    const currentDay = getCurrentDay(activePlan.id);
    const readings = readingPlanService.getTodaysReading(activePlan.id, currentDay)?.readings || [];
    const fetchedContent: { ref: string, text: string[] }[] = [];

    try {
      for (const readingRef of readings) {
        // Parse "John 3", "Genesis 1:1", or "Song of Solomon 2"
        // Improved regex: Capture everything up to the last number as the book, and the last number as the chapter
        const match = readingRef.match(/^(.+?)\s+(\d+)(?::.*)?$/);
        if (match) {
          const bookName = match[1].trim();
          const chapter = parseInt(match[2]);
          const normalizedBook = normalizeBookApiName(bookName.replace(/\s+/g, '-')); // Use dash for API names often

          // Use preferred translation or default to KJV
          const version = preferences.preferredTranslation || "asv";

          const chapterData = await enhancedApiBibleService.getChapter(version, normalizedBook, chapter);

          if (chapterData && chapterData.verses) {
            const text = chapterData.verses.map(v =>
              `${v.verse}. ${v.text.replace(/<[^>]*>/g, '')}` // Strip HTML for clean reading
            );
            fetchedContent.push({ ref: readingRef, text });
          } else {
            fetchedContent.push({ ref: readingRef, text: ["Could not load text. Please read in Bible."] });
          }
        }
      }
      setScriptureContent(fetchedContent);
    } catch (err) {
      console.error("Error fetching inline scripture", err);
      toast({ title: "Error loading scripture", description: "Please check your connection.", variant: "destructive" });
    } finally {
      setIsLoadingScripture(false);
    }
  };

  const completeDailyReading = async () => {
    if (!activeReadingPlan || !user) return;

    const currentDay = getCurrentDay(activeReadingPlan);
    const progress = planProgress[activeReadingPlan];
    const completedDays = progress?.completed_days || [];

    // Prevent duplicate completion
    if (!completedDays.includes(currentDay.toString())) {
      const newCompletedDays = [...completedDays, currentDay.toString()];
      const nextDay = currentDay + 1;

      const { error } = await supabase
        .from('reading_plan_progress')
        .update({
          completed_days: newCompletedDays,
          current_day: nextDay
        })
        .eq('user_id', user.id)
        .eq('plan_id', activeReadingPlan);

      if (!error) {
        fetchUserProgress();
      }
    }
    setReadingStep('outro');
  };


  const handleOpenScripture = (reading: string) => {
    // Parse "John 3", "Song of Solomon 2", etc.
    const match = reading.match(/^(.+?)\s+(\d+)(?::.*)?$/);

    if (match) {
      // Normalize book name
      let book = match[1].trim().toLowerCase();
      // Use helper to normalize "song of solomon" -> "song-of-solomon"
      const normalizedBook = normalizeBookApiName(book.replace(/\s+/g, '-'));

      const chapter = parseInt(match[2]);

      navigate('/bible', { state: { book: normalizedBook, chapter } });
    } else {
      // Fallback
      navigate('/bible');
    }
  };

  // Helper to get the first reading reference for a plan day
  const getFirstReadingForDay = (planId: string): string | null => {
    const currentDay = getCurrentDay(planId);
    const todaysReading = readingPlanService.getTodaysReading(planId, currentDay);
    return todaysReading?.readings[0] || null;
  };

  // --- Render Helpers ---

  const PlanCard = ({ plan, enrolled }: { plan: ReadingPlan, enrolled?: boolean }) => {
    const gradient = getPlanGradient(plan.category);
    const currentDay = getCurrentDay(plan.id);
    const progress = planProgress[plan.id];
    const percent = progress ? ((progress.completed_days?.length || 0) / plan.totalDays) * 100 : 0;

    const firstReading = enrolled ? getFirstReadingForDay(plan.id) : null;

    return (
      <div
        onClick={(e) => {
          // Only trigger if not clicking a button
          if ((e.target as HTMLElement).closest('button')) return;
          enrolled ? startReading(plan.id) : setSelectedPlanId(plan.id);
        }}
        className="flex-shrink-0 w-[260px] cursor-pointer group relative overflow-hidden rounded-2xl border bg-white dark:bg-gray-900 shadow-sm transition-all hover:shadow-md hover:border-primary/20"
      >
        <div className={`h-32 w-full bg-gradient-to-br ${gradient} p-4 flex flex-col justify-between relative`}>
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
          <div className="flex justify-between items-start relative z-10">
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm shadow-sm">
              {plan.duration}
            </Badge>
            {enrolled && (
              <div className="bg-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full text-gray-800 shadow-sm">
                Day {currentDay}
              </div>
            )}
          </div>
          <h3 className="text-white font-bold text-lg leading-tight drop-shadow-md relative z-10">{plan.name}</h3>
        </div>
        <div className="p-4">
          {enrolled ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>Progress</span>
                <span>{Math.round(percent)}%</span>
              </div>
              <Progress value={percent} className="h-2 bg-gray-100 dark:bg-gray-800" />
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (firstReading) {
                      handleOpenScripture(firstReading);
                    }
                  }}
                  variant="outline"
                  className="flex-1 h-9 text-xs font-semibold rounded-xl"
                  size="sm"
                >
                  Read Now
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    startReading(plan.id);
                  }}
                  className="flex-1 h-9 text-xs font-semibold rounded-xl bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"
                  size="sm"
                >
                  Continue <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground line-clamp-2 h-8 leading-relaxed">{plan.description}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <Users className="w-3 h-3" /> <span>Join thousands reading</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-10">

      {/* --- Section: My Plans --- */}
      {enrolledPlans.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              My Plans <Badge variant="secondary" className="rounded-full px-2 text-xs font-normal">{enrolledPlans.length}</Badge>
            </h2>
          </div>
          <ScrollArea className="w-full whitespace-nowrap pb-4 -mx-1 px-1">
            <div className="flex w-max space-x-4">
              {enrolledPlans.map(id => {
                const plan = readingPlans.find(p => p.id === id);
                return plan ? <PlanCard key={id} plan={plan} enrolled /> : null;
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* --- Section: Discover --- */}
      <div className="space-y-5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Discover New Plans</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {readingPlans.filter(p => !enrolledPlans.includes(p.id)).map(plan => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className="flex gap-4 p-4 rounded-2xl border bg-card hover:bg-accent/40 hover:border-primary/20 transition-all cursor-pointer group"
            >
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getPlanGradient(plan.category)} flex items-center justify-center text-white shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                {plan.category === 'beginner' ? <Heart className="w-7 h-7 drop-shadow-sm" /> :
                  plan.category === 'advanced' ? <Target className="w-7 h-7 drop-shadow-sm" /> :
                    <BookOpen className="w-7 h-7 drop-shadow-sm" />}
              </div>
              <div className="flex flex-col justify-center overflow-hidden min-w-0">
                <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">{plan.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{plan.description}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">{plan.duration}</Badge>
                  <span className="text-[10px] text-muted-foreground capitalize">• {plan.category}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto self-center opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>


      {/* --- Dialog: Plan Details --- */}
      <Dialog open={!!selectedPlanId} onOpenChange={(open) => !open && setSelectedPlanId(null)}>
        <DialogContent className="sm:max-w-[400px] overflow-hidden p-0 gap-0 border-0 rounded-[32px] shadow-2xl">
          {selectedPlan && (
            <>
              <div className={`relative h-48 bg-gradient-to-br ${getPlanGradient(selectedPlan.category)} p-6 flex flex-col justify-end`}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/20 rounded-full"
                  onClick={() => setSelectedPlanId(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
                <Badge className="w-fit mb-3 bg-white/20 text-white border-0 backdrop-blur-md">{selectedPlan.category}</Badge>
                <h2 className="text-3xl font-bold text-white shadow-sm leading-tight mb-1">{selectedPlan.name}</h2>
                <span className="text-white/80 text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" /> 24k • {selectedPlan.duration}
                </span>
              </div>
              <div className="p-6 space-y-6 bg-white dark:bg-gray-900">
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-foreground uppercase tracking-wide opacity-70">About this plan</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">{selectedPlan.description}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-foreground uppercase tracking-wide opacity-70">Day 1 Preview</h4>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-medium">
                        <div className="text-foreground">Daily Devotional</div>
                        <div className="text-muted-foreground">Focus your heart</div>
                      </div>
                    </div>
                    <div className="w-full h-px bg-gray-200 dark:bg-gray-700" />
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center shrink-0">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-medium">
                        <div className="text-foreground">{selectedPlan.dailyReadings[0]?.readings[0]}</div>
                        <div className="text-muted-foreground">Scripture Reading</div>
                      </div>
                    </div>
                  </div>
                </div>

                <Button onClick={() => handleEnrollPlan(selectedPlan.id)} className="w-full rounded-2xl py-6 text-base font-bold shadow-lg bg-blue-600 hover:bg-blue-700 text-white transition-all hover:scale-[1.02] active:scale-[0.98]">
                  Start Plan
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>


      {/* --- Immersive Reading Mode Overlay --- */}
      <Dialog open={!!activeReadingPlan} onOpenChange={(open) => !open && activeReadingPlan && setActiveReadingPlan(null)}>
        <DialogContent className="max-w-full h-[100dvh] sm:h-[90vh] sm:max-w-[500px] flex flex-col p-0 overflow-hidden sm:rounded-[40px] border-0 gap-0">
          {activePlan && (
            <>
              {/* Reading Header */}
              <div className="h-[calc(4rem+env(safe-area-inset-top))] border-b flex items-center justify-between px-4 bg-background z-20 shrink-0 pt-[env(safe-area-inset-top)]">
                <Button variant="ghost" size="icon" onClick={() => setActiveReadingPlan(null)} className="-ml-2">
                  <X className="w-6 h-6" />
                </Button>
                <div className="flex flex-col items-center">
                  <span className="font-bold text-sm">Day {getCurrentDay(activePlan.id)}</span>
                  {/* Progress dots */}
                  <div className="flex gap-1 mt-1">
                    {['intro', 'devotional', 'scripture', 'outro'].map((step, i) => (
                      <div key={step} className={`w-1.5 h-1.5 rounded-full transition-colors ${step === readingStep ? 'bg-primary' :
                        ['intro', 'devotional', 'scripture', 'outro'].indexOf(readingStep) > i ? 'bg-primary/40' : 'bg-gray-200 dark:bg-gray-800'
                        }`} />
                    ))}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="-mr-2 text-muted-foreground"><Share2 className="w-5 h-5" /></Button>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-black/20 scroll-smooth">

                {readingStep === 'intro' && (
                  <div className="min-h-full flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in zoom-in-95 duration-500">
                    <div className={`w-32 h-32 rounded-[32px] bg-gradient-to-br ${getPlanGradient(activePlan.category)} flex items-center justify-center shadow-xl rotate-3`}>
                      <BookOpen className="w-12 h-12 text-white drop-shadow-md" />
                    </div>
                    <div className="space-y-3 max-w-xs mx-auto">
                      <h2 className="text-3xl font-bold tracking-tight">Day {getCurrentDay(activePlan.id)}</h2>
                      <p className="text-muted-foreground font-medium text-lg leading-relaxed">
                        {activePlan.dailyReadings[getCurrentDay(activePlan.id) - 1]?.description || "Today's Reading"}
                      </p>
                    </div>
                    <Button size="lg" className="rounded-full px-12 h-14 text-base font-bold shadow-lg shadow-primary/20" onClick={() => setReadingStep('devotional')}>
                      Let's Begin
                    </Button>
                  </div>
                )}

                {readingStep === 'devotional' && (
                  <div className="min-h-full flex flex-col p-6 animate-in slide-in-from-right-10 duration-300">
                    <div className="flex-1 space-y-6 max-w-lg mx-auto w-full">
                      <div className="w-10 h-1 bg-primary/20 rounded-full mb-4" />

                      {(() => {
                        const currentDay = getCurrentDay(activePlan.id);
                        const dayData = activePlan.dailyReadings[currentDay - 1];

                        return (
                          <>
                            <h3 className="text-2xl font-bold text-foreground">
                              {dayData?.teachingTitle || "Prepare Your Heart"}
                            </h3>

                            <div className="prose dark:prose-invert prose-lg leading-relaxed text-muted-foreground/90 space-y-4">
                              {dayData?.teachingText ? (
                                dayData.teachingText.split('\n\n').map((paragraph, pIdx) => (
                                  <p key={pIdx}>{paragraph}</p>
                                ))
                              ) : (
                                <>
                                  <p>Before you read today's scripture, take a moment to pause. The Bible is more than just text; it's a living invitation to know God.</p>
                                  <p className="italic border-l-4 border-primary/30 pl-4 py-1 my-6 bg-primary/5 rounded-r-lg">
                                    "Open my eyes that I may see wonderful things in your law." - Psalm 119:18
                                  </p>
                                  <p>As you read, ask yourself: What is this passage teaching me about God's character? How does it apply to my life today?</p>
                                </>
                              )}

                              {dayData?.reflectionQuestion && (
                                <div className="mt-8 p-6 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
                                  <h4 className="font-bold text-sm text-primary uppercase tracking-wider flex items-center gap-2">
                                    <Heart className="w-4 h-4" /> Reflection Question
                                  </h4>
                                  <p className="text-foreground font-medium italic">
                                    "{dayData.reflectionQuestion}"
                                  </p>
                                </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="pt-10 pb-4 sticky bottom-0 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent dark:from-black dark:via-black">
                      <Button onClick={() => setReadingStep('scripture')} className="w-full rounded-2xl h-14 text-base font-bold shadow-md">
                        Read Scripture <ChevronRight className="w-5 h-5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {readingStep === 'scripture' && (
                  <div className="min-h-full flex flex-col p-0 animate-in slide-in-from-right-10 duration-300">

                    {/* Scripture Content */}
                    <div className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full">
                      {isLoadingScripture ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <p>Loading God's Word...</p>
                        </div>
                      ) : scriptureContent.length > 0 ? (
                        <>
                          {scriptureContent.map((content, idx) => (
                            <div key={idx} className="space-y-4">
                              <div className="flex items-center gap-2 sticky top-0 bg-gray-50/95 dark:bg-black/95 py-3 z-10 backdrop-blur-sm border-b border-transparent">
                                <div className="w-1 h-6 bg-primary rounded-full" />
                                <h3 className="text-xl font-bold tracking-tight">{content.ref}</h3>
                              </div>
                              <div className="space-y-4 text-lg leading-loose font-serif text-foreground/90">
                                {content.text.map((verse, vIdx) => (
                                  <p key={vIdx} className="first-letter:text-2xl first-letter:font-bold first-letter:mr-0.5 first-letter:text-primary/70">
                                    {verse}
                                  </p>
                                ))}
                              </div>
                              {idx < scriptureContent.length - 1 && <div className="h-px bg-border my-8" />}
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="text-center py-10 space-y-4">
                          <p className="text-muted-foreground">Unable to load text directly.</p>
                          <Button variant="outline" onClick={() => {
                            // Fallback: just open Bible
                            const ref = readingPlanService.getTodaysReading(activePlan.id, getCurrentDay(activePlan.id))?.readings[0];
                            if (ref) handleOpenScripture(ref);
                          }}>Open in Bible Reader</Button>
                        </div>
                      )}
                    </div>

                    {/* Footer Action */}
                    <div className="p-6 pt-2 sticky bottom-0 bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent dark:from-black dark:via-black/90">
                      <Button
                        onClick={completeDailyReading}
                        className="w-full rounded-2xl h-14 text-base font-bold shadow-lg bg-green-600 hover:bg-green-700 text-white"
                        disabled={isLoadingScripture}
                      >
                        Finish Reading <Check className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {readingStep === 'outro' && (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full animate-pulse" />
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-4 relative z-10 shadow-xl">
                        <CheckCircle className="w-14 h-14 text-white" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h2 className="text-4xl font-bold text-foreground">Completed!</h2>
                      <p className="text-muted-foreground text-lg">
                        Day {getCurrentDay(activePlan.id) - 1} of <span className="font-semibold text-foreground">{activePlan.name}</span>
                      </p>
                    </div>

                    <div className="p-4 bg-card rounded-2xl border shadow-sm w-full max-w-xs mx-auto">
                      <div className="text-sm font-medium text-muted-foreground mb-2">Total Progress</div>
                      <Progress value={(((planProgress[activePlan.id]?.completed_days?.length || 0) / activePlan.totalDays) * 100)} className="h-3" />
                    </div>

                    <Button size="lg" className="rounded-full px-12 h-14 text-base font-bold" onClick={() => setActiveReadingPlan(null)}>
                      Back to Plans
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default BibleReadingPlans;
