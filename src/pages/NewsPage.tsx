
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

  const displayEvents = useMemo(() => {
    return events;
  }, [events]);

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



  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 space-y-12 pb-20 animate-in fade-in duration-700">
      {/* Immersive Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-800/20 via-slate-900 to-slate-900 z-0" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-700/20 rounded-full blur-3xl opacity-50 animate-pulse" />
        <div className="absolute top-1/2 -right-24 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl opacity-50 animate-pulse" />

        <div className="relative z-10 container mx-auto px-6 lg:px-8">
          <div className="max-w-2xl animate-in slide-in-from-left-8 duration-1000">
            <Badge variant="outline" className="mb-6 border-blue-500/50 text-blue-400 px-3 py-1 text-xs uppercase tracking-widest font-bold bg-blue-500/5">
              Updates & Announcements
            </Badge>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl mb-6 leading-tight">
              Stay <span className="text-blue-400">Connected</span> with Our Community.
            </h1>
            <p className="text-lg leading-8 text-slate-300 mb-10 max-w-xl text-balance">
              Get the latest news, upcoming events, and important announcements from our church family.
            </p>
            <div className="flex items-center gap-x-6">
              {isAdmin && (
                <Button
                  onClick={() => setIsManageEventsOpen(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20 transition-all active:scale-95 group"
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

        {/* Featured Events Vertical List */}
        {displayEvents.length > 0 && (
          <div className="animate-in slide-in-from-bottom-8 duration-700 delay-200 flex flex-col gap-8">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">Upcoming Events</h2>
            </div>
            {displayEvents.map((event) => (
              <Card key={event.id} className="group border-none bg-slate-900 text-white overflow-hidden shadow-2xl relative min-h-[450px] flex flex-col justify-end transition-all hover:shadow-blue-500/10">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=2073')] bg-cover bg-center brightness-50 group-hover:scale-105 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-0" />

                <div className="relative z-10 p-8 sm:p-12 space-y-6 max-w-3xl">
                  <div className="flex items-center gap-3">
                    <span className="text-white/60 text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
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
                        <Clock className="w-5 h-5 text-blue-400" />
                        {formatTime(event.event_time)}
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-2 text-slate-300 font-bold uppercase tracking-wider text-xs">
                        <MapPin className="w-5 h-5 text-blue-400" />
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
                      <Button className="flex-1 sm:flex-none bg-white text-slate-900 hover:bg-blue-50 font-black px-8 py-6 h-auto transition-all active:scale-95 shadow-xl shadow-black/50">
                        Join Us This Week
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Announcements & Newsletter - Centered Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto animate-in slide-in-from-bottom-8 duration-1000 delay-300">
          <div id="announcements-sidebar" className="space-y-8 scroll-mt-24 w-full">
            {/* Announcements Hub */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800/60 shadow-sm relative overflow-hidden h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
              <AnnouncementsHub />
            </div>
          </div>

          <div className="space-y-8 w-full">
            {/* Newsletter CTA */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group h-full flex flex-col justify-center">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
              <div className="relative z-10 space-y-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-black tracking-tight">Stay in the Loop</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Subscribe to our weekly newsletter for exclusive updates and highlights.
                </p>
                <div className="space-y-3 pt-2">
                  <Input
                    placeholder="Enter your email"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  />
                  <Button className="w-full bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20">
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
          <DialogContent className="w-full h-[100dvh] max-w-none m-0 p-0 rounded-none border-none shadow-none bg-white dark:bg-slate-950 flex flex-col overflow-hidden fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 z-[200] [&>button]:z-[310] [&>button]:right-6 [&>button]:top-[calc(env(safe-area-inset-top)+1.5rem)] sm:[&>button]:top-8 [&>button]:h-11 [&>button]:w-11 [&>button]:bg-transparent [&>button]:opacity-100 [&>button]:transition-all [&>button]:duration-200 [&>button]:hover:scale-125 [&>button]:active:scale-95 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button_svg]:h-7 [&>button_svg]:w-7 [&>button_svg]:text-slate-900 [&>button_svg]:dark:text-white [&>button_svg]:transition-none [&>button]:!ring-0 [&>button]:!outline-none [&>button]:!focus:ring-0 [&>button]:!focus:outline-none [&>button]:!focus-visible:ring-0 [&>button]:!focus-visible:outline-none [&>button]:border-none [&>button]:shadow-none">
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
