
import { useState, useEffect, useMemo } from "react";
import AnnouncementsHub from "@/components/AnnouncementsHub";
import EventsManager from "@/components/EventsManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, Star, Settings, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Event = Tables<"events">;

const NewsPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManageEventsOpen, setIsManageEventsOpen] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchEvents();
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const displayFeatured = useMemo(() => {
    const featured = events.filter(e => e.is_featured);
    return featured.length > 0 ? featured : (events.length > 0 ? [events[0]] : []);
  }, [events]);

  useEffect(() => {
    // Exclude all featured events from the latest events list to prevent duplication
    const featuredIds = new Set(displayFeatured.map(e => e.id));
    let baseEvents = events.filter(e => !featuredIds.has(e.id));

    if (selectedCategory === "all") {
      setFilteredEvents(baseEvents);
    } else {
      setFilteredEvents(baseEvents.filter(event => event.event_type === selectedCategory));
    }
  }, [selectedCategory, events, displayFeatured]);

  const checkAdminStatus = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .eq('is_active', true)
      .in('role', ['administrator', 'pastor']);

    if (data && data.length > 0) {
      setIsAdmin(true);
    }
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });

    if (error) {
      console.error("Error fetching events:", error);
    }

    if (data) {
      setEvents(data);
    } else {
      setEvents([]);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-900/50';
      case 'medium': return 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/50';
      case 'low': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/50';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-900/50';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'special': return 'bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-900/50';
      case 'youth': return 'bg-sky-500/10 text-sky-600 border-sky-200 dark:border-sky-900/50';
      case 'evangelism': return 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-900/50';
      case 'campus': return 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-900/50';
      case 'workers': return 'bg-teal-500/10 text-teal-600 border-teal-200 dark:border-teal-900/50';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-900/50';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      full: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const categories = ["all", "special", "youth", "evangelism", "campus", "workers"];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 space-y-12 pb-20 animate-in fade-in duration-700">
      {/* Immersive Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-slate-900 to-slate-900 z-0" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl opacity-50 animate-pulse" />
        <div className="absolute top-1/2 -right-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl opacity-50 animate-pulse" />

        <div className="relative z-10 container mx-auto px-6 lg:px-8">
          <div className="max-w-2xl animate-in slide-in-from-left-8 duration-1000">
            <Badge variant="outline" className="mb-6 border-indigo-500/50 text-indigo-400 px-3 py-1 text-xs uppercase tracking-widest font-bold bg-indigo-500/5">
              Updates & Announcements
            </Badge>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl mb-6 leading-tight">
              Stay <span className="text-indigo-400">Connected</span> with Our Community.
            </h1>
            <p className="text-lg leading-8 text-slate-300 mb-10 max-w-xl text-balance">
              Get the latest news, upcoming events, and important announcements from our church family.
            </p>
            <div className="flex items-center gap-x-6">
              {isAdmin && (
                <Button
                  onClick={() => setIsManageEventsOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20 transition-all active:scale-95 group"
                >
                  <Settings className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform duration-500" />
                  Manage Events
                </Button>
              )}
              <Button
                variant="link"
                className="text-slate-300 hover:text-white transition-colors"
                onClick={() => {
                  const element = document.getElementById('announcements-sidebar');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                View All Announcements <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-8 space-y-16">
        {/* Category Filters */}
        <div className="flex flex-col space-y-4 animate-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Filter By Category</h2>
            <span className="text-xs font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">
              {filteredEvents.length} Events
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-bold transition-all border outline-none",
                  selectedCategory === cat
                    ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-white dark:border-white dark:text-slate-900"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Events Vertical List */}
        {displayFeatured.length > 0 && (
          <div className="animate-in slide-in-from-bottom-8 duration-700 delay-200 flex flex-col gap-8">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500">Featured Highlights</h2>
            </div>
            {displayFeatured.map((event) => (
              <Card key={event.id} className="group border-none bg-slate-900 text-white overflow-hidden shadow-2xl relative min-h-[450px] flex flex-col justify-end transition-all hover:shadow-indigo-500/10">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=2073')] bg-cover bg-center brightness-50 group-hover:scale-105 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-0" />

                <div className="relative z-10 p-8 sm:p-12 space-y-6 max-w-3xl">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-amber-500 text-white border-transparent px-3 py-1 text-xs uppercase tracking-widest font-black">
                      Featured Event
                    </Badge>
                    <span className="text-white/60 text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      {formatDate(event.event_date).full}
                    </span>
                  </div>

                  <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                    {event.title}
                  </h2>
                  <p className="text-lg text-slate-300 leading-relaxed font-medium line-clamp-3">
                    {event.description}
                  </p>

                  <div className="flex flex-wrap gap-6 items-center pt-4">
                    {event.event_time && (
                      <div className="flex items-center gap-2 text-slate-300 font-bold border-r border-white/10 pr-6 uppercase tracking-wider text-xs">
                        <Clock className="w-5 h-5 text-indigo-400" />
                        {formatTime(event.event_time)}
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-2 text-slate-300 font-bold uppercase tracking-wider text-xs">
                        <MapPin className="w-5 h-5 text-indigo-400" />
                        {event.location}
                      </div>
                    )}
                    <div className="sm:ml-auto flex items-center gap-3 w-full sm:w-auto">
                      {isAdmin && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditEventId(event.id);
                            setIsManageEventsOpen(true);
                          }}
                          className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 font-bold"
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      )}
                      <Button className="flex-1 sm:flex-none bg-white text-slate-900 hover:bg-indigo-50 font-black px-8 py-6 h-auto transition-all active:scale-95 shadow-xl shadow-black/50">
                        Join Us This Week
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Upcoming Events Grid & Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-in slide-in-from-bottom-8 duration-1000 delay-300">
          {/* Main Events Feed */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Calendar className="w-6 h-6 text-indigo-500" />
                Latest Events
              </h3>
            </div>

            {filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {filteredEvents.map((event) => {
                  const dateInfo = formatDate(event.event_date);
                  return (
                    <Card
                      key={event.id}
                      className="group border-none bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl transition-all border border-slate-200/60 dark:border-slate-800/60 overflow-hidden relative"
                    >
                      <div className="flex flex-col sm:flex-row">
                        {/* Date Left Card */}
                        <div className="w-full sm:w-24 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center py-4 border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800">
                          <span className="text-3xl font-black text-slate-900 dark:text-white leading-none mb-1">{dateInfo.day}</span>
                          <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{dateInfo.month}</span>
                        </div>

                        <div className="flex-1 p-6 relative">
                          <CardHeader className="p-0 mb-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <Badge variant="outline" className={cn(getPriorityColor(event.priority), "text-[10px] uppercase border-none px-2")}>
                                    {event.priority}
                                  </Badge>
                                  <Badge variant="outline" className={cn(getEventTypeColor(event.event_type || ''), "text-[10px] uppercase border-none px-2")}>
                                    {event.event_type}
                                  </Badge>
                                </div>
                                <CardTitle className="text-xl font-bold group-hover:text-indigo-600 transition-colors">
                                  {event.title}
                                  {event.is_featured && (
                                    <Star className="inline-block ml-2 w-4 h-4 text-amber-400 fill-amber-400" />
                                  )}
                                </CardTitle>
                              </div>

                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditEventId(event.id);
                                    setIsManageEventsOpen(true);
                                  }}
                                  className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                                >
                                  <Settings className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </CardHeader>

                          <CardContent className="p-0 space-y-4">
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                              {event.description}
                            </p>

                            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
                              {event.event_time && (
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                  {formatTime(event.event_time)}
                                </div>
                              )}
                              {event.location && (
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                  {event.location}
                                </div>
                              )}
                            </div>
                          </CardContent>

                          <Button variant="ghost" size="icon" className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {events.length === 0
                    ? "No upcoming events found"
                    : selectedCategory === "all"
                      ? "All events are featured above"
                      : "No events for this category"}
                </h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                  {events.length === 0
                    ? "Check back later for new updates and community events."
                    : selectedCategory === "all"
                      ? "Check out our highlighted events in the carousel at the top of the page."
                      : "Try selecting a different category or check back later."}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar Area */}
          <div id="announcements-sidebar" className="space-y-8 scroll-mt-24">
            {/* Announcements Hub */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800/60 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16" />
              <AnnouncementsHub />
            </div>

            {/* Newsletter CTA */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
              <div className="relative z-10 space-y-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-black tracking-tight">Stay in the Loop</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Subscribe to our weekly newsletter for exclusive updates and highlights.
                </p>
                <div className="space-y-3 pt-2">
                  <Input
                    placeholder="Enter your email"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                  />
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-500/20">
                    Subscribe Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <Dialog
          open={isManageEventsOpen}
          onOpenChange={(open) => {
            setIsManageEventsOpen(open);
            if (!open) {
              setEditEventId(null);
              fetchEvents(); // Refresh events when closing management
            }
          }}
        >
          <DialogContent className="w-full h-[100dvh] max-w-none m-0 p-0 rounded-none border-none shadow-none bg-white dark:bg-slate-950 flex flex-col overflow-hidden fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 z-[200] [&>button]:z-[310] [&>button]:right-6 [&>button]:top-[calc(env(safe-area-inset-top)+1.5rem)] sm:[&>button]:top-8 [&>button]:h-11 [&>button]:w-11 [&>button]:bg-white/80 [&>button]:dark:bg-slate-900/80 [&>button]:backdrop-blur-xl [&>button]:rounded-full [&>button]:shadow-xl [&>button]:border [&>button]:border-slate-200/50 [&>button]:dark:border-slate-800/50 [&>button]:opacity-100 [&>button]:transition-all [&>button]:duration-200 [&>button]:hover:scale-110 [&>button]:active:scale-95 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button_svg]:h-5 [&>button_svg]:w-5 [&>button_svg]:text-slate-900 [&>button_svg]:dark:text-white [&>button_svg]:transition-none [&>button]:ring-0 [&>button]:outline-none [&>button]:focus:ring-0 [&>button]:focus:outline-none">
            <div
              className="p-8 sm:p-12 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 pr-20 sm:pr-32"
              style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' }}
            >
              <div className="max-w-6xl mx-auto flex flex-col gap-2">
                <DialogHeader>
                  <div className="flex items-center gap-4 mb-1">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                      <Settings className="w-6 h-6 animate-spin-slow" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl sm:text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                        Events Control
                      </DialogTitle>
                      <DialogDescription className="text-xs sm:text-sm font-bold text-indigo-500 uppercase tracking-[0.2em]">
                        Admin Command Center
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
              <div className="max-w-6xl mx-auto p-6 sm:p-12">
                <EventsManager initialEditEventId={editEventId} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default NewsPage;
