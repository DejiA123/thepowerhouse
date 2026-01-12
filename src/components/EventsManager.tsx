import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, Plus, Edit, Trash2, Star, Calendar as CalendarIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Event = Tables<"events">;

interface EventsManagerProps {
  initialEditEventId?: string | null;
}

const EventsManager = ({ initialEditEventId }: EventsManagerProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_date: "",
    event_time: "",
    location: "",
    event_type: "general",
    priority: "medium",
    is_featured: false
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const eventTypes = [
    { value: "general", label: "General" },
    { value: "youth", label: "Youth" },
    { value: "evangelism", label: "Evangelism" },
    { value: "campus", label: "Campus" },
    { value: "workers", label: "Workers" },
    { value: "special", label: "Special" }
  ];

  const priorities = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" }
  ];

  useEffect(() => {
    fetchEvents();
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  useEffect(() => {
    if (initialEditEventId && events.length > 0) {
      const eventToEdit = events.find(e => e.id === initialEditEventId);
      if (eventToEdit) {
        setEditEvent(eventToEdit);
      }
    }
  }, [initialEditEventId, events]);

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

    if (data) {
      setEvents(data);
    } else {
      setEvents([]);
    }
  };

  const createEvent = async () => {
    if (!user || !newEvent.title || !newEvent.event_date) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('events')
      .insert({
        title: newEvent.title,
        description: newEvent.description,
        event_date: newEvent.event_date,
        event_time: newEvent.event_time || null,
        location: newEvent.location || null,
        event_type: newEvent.event_type,
        priority: newEvent.priority,
        is_featured: newEvent.is_featured,
        created_by: user.id
      })
      .select();

    if (!error) {
      toast({ title: "Success", description: "Event created successfully" });
      setNewEvent({
        title: "",
        description: "",
        event_date: "",
        event_time: "",
        location: "",
        event_type: "general",
        priority: "medium",
        is_featured: false
      });
      setIsDialogOpen(false);
      await fetchEvents();
    } else {
      console.error("Failed to create event:", error);
      toast({ title: "Error", description: `Failed to create event: ${error.message}`, variant: "destructive" });
    }

    setLoading(false);
  };

  const updateEvent = async () => {
    if (!editEvent || !editEvent.title || !editEvent.event_date) return;
    setEditLoading(true);
    const { error } = await supabase
      .from('events')
      .update({
        title: editEvent.title,
        description: editEvent.description,
        event_date: editEvent.event_date,
        event_time: editEvent.event_time,
        location: editEvent.location,
        event_type: editEvent.event_type,
        priority: editEvent.priority,
        is_featured: editEvent.is_featured
      })
      .eq('id', editEvent.id);
    setEditLoading(false);
    if (!error) {
      toast({ title: "Success", description: "Event updated successfully" });
      setEditEvent(null);
      fetchEvents();
    } else {
      toast({ title: "Error", description: "Failed to update event", variant: "destructive" });
    }
  };

  const deleteEvent = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', deleteId);
    setDeleteLoading(false);
    if (!error) {
      toast({ title: "Deleted", description: "Event deleted successfully" });
      setDeleteId(null);
      fetchEvents();
    } else {
      toast({ title: "Error", description: "Failed to delete event", variant: "destructive" });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'special': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'youth': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'evangelism': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'campus': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'workers': return 'bg-teal-100 text-teal-800 border-teal-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Events Hub</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-0.5">Manage All Church Activities</p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-6 h-auto rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 group">
              <Plus className="w-5 h-5 mr-3 group-hover:rotate-90 transition-transform duration-300" />
              Add New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="fixed inset-0 z-[300] w-full h-[100dvh] max-w-none m-0 p-0 rounded-none border-none shadow-none bg-white dark:bg-slate-950 flex flex-col overflow-hidden translate-x-0 translate-y-0 [&>button]:z-[310] [&>button]:right-6 [&>button]:top-[calc(env(safe-area-inset-top)+1.5rem)] [&>button]:h-12 [&>button]:w-12 [&>button]:bg-white/90 [&>button]:dark:bg-slate-900/90 [&>button]:backdrop-blur-2xl [&>button]:rounded-2xl [&>button]:shadow-2xl [&>button]:border-2 [&>button]:border-slate-200/50 [&>button]:dark:border-slate-700/50 [&>button]:opacity-100 [&>button]:transition-all [&>button]:duration-300 [&>button]:hover:scale-110 [&>button]:hover:rotate-90 [&>button]:active:scale-90 [&>button]:hover:bg-white [&>button]:dark:hover:bg-slate-800 [&>button]:hover:border-indigo-500 [&>button_svg]:h-6 [&>button_svg]:w-6 [&>button_svg]:text-slate-900 [&>button_svg]:dark:text-white [&>button_svg]:transition-colors">
            <div
              className="sticky top-0 z-10 p-8 sm:p-12 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md"
              style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' }}
            >
              <div className="max-w-3xl mx-auto flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">Create Event</DialogTitle>
                  <p className="text-xs sm:text-sm font-bold text-indigo-500 uppercase tracking-[0.2em] mt-1">Schedule a new highlight</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/30 p-8 sm:p-12">
              <div className="max-w-3xl mx-auto space-y-10">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">Event Title *</label>
                  <Input
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="The Grand Opening..."
                    className="h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus-visible:ring-indigo-500 font-bold text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">Description</label>
                  <Textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What should people know about this event?"
                    rows={3}
                    className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus-visible:ring-indigo-500 resize-none py-4"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">Date *</label>
                    <Input
                      type="date"
                      value={newEvent.event_date}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, event_date: e.target.value }))}
                      className="h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">Time</label>
                    <Input
                      type="time"
                      value={newEvent.event_time}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, event_time: e.target.value }))}
                      className="h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={newEvent.location}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Enter venue location"
                      className="h-12 pl-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">Category</label>
                    <Select value={newEvent.event_type} onValueChange={(value) => setNewEvent(prev => ({ ...prev, event_type: value }))}>
                      <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-indigo-500 capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-none shadow-2xl rounded-2xl bg-white dark:bg-slate-900">
                        {eventTypes.map(type => (
                          <SelectItem key={type.value} value={type.value} className="focus:bg-indigo-50 dark:focus:bg-indigo-900/40 rounded-lg mx-1">{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">Priority</label>
                    <Select value={newEvent.priority} onValueChange={(value) => setNewEvent(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-indigo-500 capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-none shadow-2xl rounded-2xl bg-white dark:bg-slate-900">
                        {priorities.map(priority => (
                          <SelectItem key={priority.value} value={priority.value} className="focus:bg-indigo-50 dark:focus:bg-indigo-900/40 rounded-lg mx-1">{priority.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/20">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={newEvent.is_featured}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, is_featured: e.target.checked }))}
                    className="w-5 h-5 rounded-lg border-2 border-indigo-300 dark:border-indigo-800 text-indigo-600 focus:ring-indigo-500 transition-colors"
                  />
                  <label htmlFor="featured" className="text-sm font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Feature in News Banner</label>
                </div>
              </div>
            </div>
            <DialogFooter className="sticky bottom-0 z-10 p-8 sm:p-12 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
              <div className="max-w-3xl mx-auto w-full flex flex-col sm:flex-row gap-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-16 px-10 rounded-2xl font-black uppercase tracking-widest text-xs flex-1 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">Cancel</Button>
                <Button
                  onClick={createEvent}
                  disabled={loading || !newEvent.title || !newEvent.event_date}
                  className="h-16 px-10 rounded-2xl font-black uppercase tracking-widest text-xs flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/30 transition-all active:scale-95"
                >
                  {loading ? "Creating..." : "Launch Event"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className="group relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 overflow-hidden"
          >
            {event.is_featured && (
              <div className="absolute top-0 right-0 p-6">
                <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-2 rounded-xl border border-amber-200/50 dark:border-amber-800/50 shadow-sm animate-pulse">
                  <Star className="w-5 h-5 fill-current" />
                </div>
              </div>
            )}

            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Badge className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-widest border-none shadow-sm", getEventTypeColor(event.event_type))}>
                  {event.event_type}
                </Badge>
                <Badge className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-widest border-none shadow-sm", getPriorityColor(event.priority))}>
                  {event.priority} Priority
                </Badge>
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-3 drop-shadow-sm">
                  {event.title}
                </h3>
                {event.description && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-2 font-medium">
                    {event.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Date</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{formatDate(event.event_date)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Time</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{event.event_time ? formatTime(event.event_time) : 'TBA'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800 mt-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-bold tracking-tight">{event.location || 'Location TBA'}</span>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditEvent(event)}
                    className="w-10 h-10 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteId(event.id)}
                    className="w-10 h-10 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-900/50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Decorative background accent */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
          </div>
        ))}

        {events.length === 0 && (
          <div className="col-span-full text-center py-24 bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-24 h-24 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarIcon className="w-10 h-10 text-indigo-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Your Event Calendar is Quiet</h3>
            <p className="text-slate-500 mt-2 font-medium">Start planning something amazing for the community.</p>
          </div>
        )}
      </div>

      {/* Edit Event Dialog */}
      <Dialog open={!!editEvent} onOpenChange={() => setEditEvent(null)}>
        <DialogContent className="fixed inset-0 z-[300] w-full h-[100dvh] max-w-none m-0 p-0 rounded-none border-none shadow-none bg-white dark:bg-slate-950 flex flex-col overflow-hidden translate-x-0 translate-y-0 [&>button]:z-[310] [&>button]:right-6 [&>button]:top-[calc(env(safe-area-inset-top)+1.5rem)] [&>button]:h-12 [&>button]:w-12 [&>button]:bg-white/90 [&>button]:dark:bg-slate-900/90 [&>button]:backdrop-blur-2xl [&>button]:rounded-2xl [&>button]:shadow-2xl [&>button]:border-2 [&>button]:border-slate-200/50 [&>button]:dark:border-slate-700/50 [&>button]:opacity-100 [&>button]:transition-all [&>button]:duration-300 [&>button]:hover:scale-110 [&>button]:hover:rotate-90 [&>button]:active:scale-90 [&>button]:hover:bg-white [&>button]:dark:hover:bg-slate-800 [&>button]:hover:border-amber-500 [&>button_svg]:h-6 [&>button_svg]:w-6 [&>button_svg]:text-slate-900 [&>button_svg]:dark:text-white [&>button_svg]:transition-colors">
          <div
            className="sticky top-0 z-10 p-8 sm:p-12 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' }}
          >
            <div className="max-w-3xl mx-auto flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                <Edit className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">Refine Event</DialogTitle>
                <p className="text-xs sm:text-sm font-bold text-amber-500 uppercase tracking-[0.2em] mt-1">Adjust event details</p>
              </div>
            </div>
          </div>
          {editEvent && (
            <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/30 p-8 sm:p-12">
              <div className="max-w-3xl mx-auto space-y-10">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">Event Title *</label>
                  <Input
                    value={editEvent.title}
                    onChange={(e) => setEditEvent(prev => prev ? { ...prev, title: e.target.value } : null)}
                    className="h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus-visible:ring-indigo-500 font-bold text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">Description</label>
                  <Textarea
                    value={editEvent.description || ""}
                    onChange={(e) => setEditEvent(prev => prev ? { ...prev, description: e.target.value } : null)}
                    rows={3}
                    className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus-visible:ring-indigo-500 resize-none py-4"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">Date *</label>
                    <Input
                      type="date"
                      value={editEvent.event_date}
                      onChange={(e) => setEditEvent(prev => prev ? { ...prev, event_date: e.target.value } : null)}
                      className="h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">Time</label>
                    <Input
                      type="time"
                      value={editEvent.event_time || ""}
                      onChange={(e) => setEditEvent(prev => prev ? { ...prev, event_time: e.target.value } : null)}
                      className="h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={editEvent.location || ""}
                      onChange={(e) => setEditEvent(prev => prev ? { ...prev, location: e.target.value } : null)}
                      className="h-12 pl-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">Category</label>
                    <Select value={editEvent.event_type} onValueChange={(value) => setEditEvent(prev => prev ? { ...prev, event_type: value } : null)}>
                      <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-indigo-500 capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-none shadow-2xl rounded-2xl bg-white dark:bg-slate-900">
                        {eventTypes.map(type => (
                          <SelectItem key={type.value} value={type.value} className="focus:bg-indigo-50 dark:focus:bg-indigo-900/40 rounded-lg mx-1">{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">Priority</label>
                    <Select value={editEvent.priority} onValueChange={(value) => setEditEvent(prev => prev ? { ...prev, priority: value } : null)}>
                      <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-indigo-500 capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-none shadow-2xl rounded-2xl bg-white dark:bg-slate-900">
                        {priorities.map(priority => (
                          <SelectItem key={priority.value} value={priority.value} className="focus:bg-indigo-50 dark:focus:bg-indigo-900/40 rounded-lg mx-1">{priority.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/20">
                  <input
                    type="checkbox"
                    id="edit-featured"
                    checked={editEvent.is_featured}
                    onChange={(e) => setEditEvent(prev => prev ? { ...prev, is_featured: e.target.checked } : null)}
                    className="w-5 h-5 rounded-lg border-2 border-indigo-300 dark:border-indigo-800 text-indigo-600 focus:ring-indigo-500 transition-colors"
                  />
                  <label htmlFor="edit-featured" className="text-sm font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Feature in News Banner</label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="sticky bottom-0 z-10 p-8 sm:p-12 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
            <div className="max-w-3xl mx-auto w-full flex flex-col sm:flex-row gap-4">
              <Button variant="outline" onClick={() => setEditEvent(null)} className="h-16 px-10 rounded-2xl font-black uppercase tracking-widest text-xs flex-1 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">Cancel</Button>
              <Button
                onClick={updateEvent}
                disabled={editLoading || !editEvent?.title || !editEvent?.event_date}
                className="h-16 px-10 rounded-2xl font-black uppercase tracking-widest text-xs flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/30 transition-all active:scale-95"
              >
                {editLoading ? "Updating..." : "Apply Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="border-none shadow-2xl rounded-[2rem] bg-white dark:bg-slate-900 p-0 overflow-y-auto max-h-[90dvh] max-w-sm text-center">
          <div className="p-8">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Delete Activity?</DialogTitle>
            <p className="text-slate-500 mt-3 font-medium px-4">This action is permanent and cannot be reversed. Proceed with caution.</p>
          </div>
          <DialogFooter className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-50 dark:border-slate-800 grid grid-cols-2 gap-4 sm:space-x-0">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="h-12 rounded-xl font-bold border-slate-200 dark:border-slate-700">Go Back</Button>
            <Button
              variant="destructive"
              onClick={deleteEvent}
              disabled={deleteLoading}
              className="h-12 rounded-xl font-black shadow-lg shadow-rose-600/20"
            >
              {deleteLoading ? "Deleting..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsManager; 