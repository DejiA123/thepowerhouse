
import { useState, useEffect } from "react";
import AnnouncementsHub from "@/components/AnnouncementsHub";
import EventsManager from "@/components/EventsManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, Star, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Event = Tables<"events">;

const NewsPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManageEventsOpen, setIsManageEventsOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchEvents();
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

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
      .eq('is_active', true)
      .order('event_date', { ascending: true });

    if (data) {
      setEvents(data);
    } else {
      setEvents([]);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch(type) {
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

  const handleManageEventsClose = () => {
    setIsManageEventsOpen(false);
    // Refresh events after management
    fetchEvents();
  };

  return (
    <div className="p-4 space-y-6">
      {/* Upcoming Events */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <h2 className="text-2xl font-bold text-foreground">Upcoming Events</h2>
          {isAdmin && (
            <Dialog open={isManageEventsOpen} onOpenChange={setIsManageEventsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center space-x-2 w-full sm:w-auto">
                  <Settings className="w-4 h-4" />
                  <span>Manage Events</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Manage Events</DialogTitle>
                </DialogHeader>
                <EventsManager />
              </DialogContent>
            </Dialog>
          )}
        </div>
        {events.length > 0 ? (
          events.map((event) => (
            <Card key={event.id} className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-6 h-6 text-blue-500 flex-shrink-0" />
                    <span className="dark:text-white break-words">{event.title}</span>
                    {event.is_featured && <Star className="w-5 h-5 text-yellow-500 fill-current flex-shrink-0" />}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:ml-auto">
                    <Badge className={`${getPriorityColor(event.priority)} text-xs`}>{event.priority}</Badge>
                    <Badge className={`${getEventTypeColor(event.event_type)} text-xs`}>{event.event_type}</Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground dark:text-white leading-relaxed">{event.description}</p>
                <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span className="break-words">{formatDate(event.event_date)}</span>
                  </div>
                  {event.event_time && (
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span>{formatTime(event.event_time)}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="break-words">{event.location}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-2 border-primary/20">
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No upcoming events at the moment. Check back soon!</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Regular Announcements Hub */}
      <AnnouncementsHub />
    </div>
  );
};

export default NewsPage;
