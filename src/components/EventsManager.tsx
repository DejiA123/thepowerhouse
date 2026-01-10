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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          <span className="text-lg font-semibold">Manage Events</span>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Event title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Event description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Date *</label>
                  <Input
                    type="date"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, event_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Time</label>
                  <Input
                    type="time"
                    value={newEvent.event_time}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, event_time: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <Input
                  value={newEvent.location}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Event location"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={newEvent.event_type} onValueChange={(value) => setNewEvent(prev => ({ ...prev, event_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={newEvent.priority} onValueChange={(value) => setNewEvent(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map(priority => (
                        <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={newEvent.is_featured}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, is_featured: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="featured" className="text-sm font-medium">Featured Event</label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={createEvent} disabled={loading || !newEvent.title || !newEvent.event_date}>
                {loading ? "Creating..." : "Create Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-semibold text-lg">{event.title}</h3>
                  {event.is_featured && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                  <Badge className={getPriorityColor(event.priority)}>{event.priority}</Badge>
                  <Badge className={getEventTypeColor(event.event_type)}>{event.event_type}</Badge>
                </div>
                {event.description && (
                  <p className="text-muted-foreground mb-2">{event.description}</p>
                )}
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(event.event_date)}</span>
                  </div>
                  {event.event_time && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(event.event_time)}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditEvent(event)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteId(event.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No events found. Create your first event!</p>
          </div>
        )}
      </div>

      {/* Edit Event Dialog */}
      <Dialog open={!!editEvent} onOpenChange={() => setEditEvent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {editEvent && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={editEvent.title}
                  onChange={(e) => setEditEvent(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="Event title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editEvent.description || ""}
                  onChange={(e) => setEditEvent(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Event description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Date *</label>
                  <Input
                    type="date"
                    value={editEvent.event_date}
                    onChange={(e) => setEditEvent(prev => prev ? { ...prev, event_date: e.target.value } : null)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Time</label>
                  <Input
                    type="time"
                    value={editEvent.event_time || ""}
                    onChange={(e) => setEditEvent(prev => prev ? { ...prev, event_time: e.target.value } : null)}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <Input
                  value={editEvent.location || ""}
                  onChange={(e) => setEditEvent(prev => prev ? { ...prev, location: e.target.value } : null)}
                  placeholder="Event location"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={editEvent.event_type} onValueChange={(value) => setEditEvent(prev => prev ? { ...prev, event_type: value } : null)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={editEvent.priority} onValueChange={(value) => setEditEvent(prev => prev ? { ...prev, priority: value } : null)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map(priority => (
                        <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-featured"
                  checked={editEvent.is_featured}
                  onChange={(e) => setEditEvent(prev => prev ? { ...prev, is_featured: e.target.checked } : null)}
                  className="rounded"
                />
                <label htmlFor="edit-featured" className="text-sm font-medium">Featured Event</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEvent(null)}>Cancel</Button>
            <Button onClick={updateEvent} disabled={editLoading || !editEvent?.title || !editEvent?.event_date}>
              {editLoading ? "Updating..." : "Update Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this event? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteEvent} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsManager; 