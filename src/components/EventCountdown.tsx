
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, Bell, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { serviceAttendanceService } from "@/services/serviceAttendanceService";
import { supabase } from "@/integrations/supabase/client";

const EventCountdown = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [reminderSet, setReminderSet] = useState(false);
  const [attendees, setAttendees] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  // Calculate next Sunday at 10:00 AM
  const getNextSunday = () => {
    const now = new Date();
    const today = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    let daysUntilSunday;
    
    if (today === 0) { // Today is Sunday
      if (currentHour < 10 || (currentHour === 10 && currentMinute < 0)) {
        // Service hasn't started yet today
        daysUntilSunday = 0;
      } else {
        // Service already happened today, next Sunday
        daysUntilSunday = 7;
      }
    } else {
      // Days until next Sunday
      daysUntilSunday = 7 - today;
    }
    
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(10, 0, 0, 0); // 10:00 AM
    
    return nextSunday;
  };

  const upcomingEvent = {
    title: "Sunday Service",
    date: getNextSunday().toDateString(),
    time: "10:00 AM",
    location: "The Power House",
    capacity: 500
  };

  // Format date and time for database
  const serviceDate = getNextSunday().toISOString().split('T')[0]; // YYYY-MM-DD
  const serviceTime = "10:00:00"; // HH:MM:SS

  useEffect(() => {
    // Load attendance data and set up real-time subscription
    const loadAttendanceData = async () => {
      if (!user) return;

      try {
        // Get current attendance count
        const count = await serviceAttendanceService.getAttendanceCount(serviceDate, serviceTime);
        setAttendees(count);

        // Check if user is already attending
        const isAttending = await serviceAttendanceService.isUserAttending(user.id, serviceDate, serviceTime);
        setReminderSet(isAttending);

        // Set up real-time subscription for attendance changes
        const channel = serviceAttendanceService.subscribeToAttendanceChanges(
          serviceDate, 
          serviceTime, 
          (newCount) => {
            console.log('📊 Attendance count updated:', newCount);
            setAttendees(newCount);
          }
        );

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('Error loading attendance data:', error);
      }
    };

    loadAttendanceData();
  }, [user, serviceDate, serviceTime]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const nextService = getNextSunday();
      const now = new Date();
      const difference = nextService.getTime() - now.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        // Service is happening now or just passed
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  const setReminder = async () => {
    if (reminderSet || !user) return; // Prevent double counting and ensure user is logged in

    try {
      // Set attendance in database
      const success = await serviceAttendanceService.setAttendance(user.id, serviceDate, serviceTime);
      
      if (!success) {
        toast({
          title: "Error",
          description: "Failed to set attendance. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setReminderSet(true);
      setAttendees(prev => prev + 1);


      // Request notification permission and set up reminder
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
        
        if (permission === "granted") {
          toast({
            title: "Attendance Confirmed!",
            description: "You'll be notified 30 minutes before the service starts.",
          });
          
          // Calculate time for 30 minutes before service
          const nextService = getNextSunday();
          const reminderTime = new Date(nextService.getTime() - 30 * 60 * 1000);
          const now = new Date();
          const timeUntilReminder = reminderTime.getTime() - now.getTime();

          if (timeUntilReminder > 0) {
            setTimeout(() => {
              new Notification("Upcoming Service", {
                body: `${upcomingEvent.title} starts in 30 minutes at ${upcomingEvent.location}`,
                icon: "/lovable-uploads/17d2a568-fd22-4680-827b-b659c3433008.png"
              });
            }, Math.min(timeUntilReminder, 2147483647)); // Max setTimeout value
          }
        } else if (permission === "denied") {
          toast({
            title: "Attendance Confirmed!",
            description: "You're now attending the service. Notifications are disabled in your browser.",
          });
        } else {
          toast({
            title: "Attendance Confirmed!",
            description: "You're now attending the service. Please allow notifications when prompted.",
          });
        }
      } else {
        toast({
          title: "Attendance Confirmed!",
          description: "You're now attending the service.",
        });
      }
    } catch (error) {
      console.error('Error setting reminder:', error);
      toast({
        title: "Error",
        description: "Failed to set attendance. Please try again.",
        variant: "destructive"
      });
    }
  };

  const isServiceHappeningNow = () => {
    const now = new Date();
    const today = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    return today === 0 && currentHour === 10 && currentMinute >= 0 && currentMinute < 90; // Service lasts 1.5 hours
  };

  const removeAttendance = async () => {
    if (!reminderSet || !user) return;

    try {
      const success = await serviceAttendanceService.removeAttendance(user.id, serviceDate, serviceTime);
      
      if (success) {
        setReminderSet(false);
        setAttendees(prev => prev - 1);
        toast({
          title: "Attendance Cancelled",
          description: "You're no longer attending this service.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to cancel attendance. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error removing attendance:', error);
      toast({
        title: "Error",
        description: "Failed to cancel attendance. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span>Next Service</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold text-foreground">{upcomingEvent.title}</h3>
          <div className="flex items-center justify-center space-x-2 text-muted-foreground mt-2">
            <Clock className="w-4 h-4" />
            <span>{upcomingEvent.time}</span>
            <MapPin className="w-4 h-4 ml-2" />
            <span>{upcomingEvent.location}</span>
          </div>
          {isServiceHappeningNow() && (
            <Badge className="mt-2 bg-green-600 text-white animate-pulse">
              LIVE NOW
            </Badge>
          )}
        </div>
        
        {!isServiceHappeningNow() ? (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {Object.entries(timeLeft).map(([unit, value]) => (
              <div key={unit} className="text-center bg-blue-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600">{value}</div>
                <div className="text-xs text-muted-foreground capitalize">{unit}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-lg font-medium text-green-600">Service is happening now!</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {attendees}/500 attending
            </span>
          </div>
          <Badge variant="outline" className="border-green-200 text-green-700">
            {Math.round((attendees / upcomingEvent.capacity) * 100)}% full
          </Badge>
        </div>

        {!isServiceHappeningNow() && (
          <Button 
            className={`w-full ${reminderSet ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            onClick={reminderSet ? removeAttendance : setReminder}
            disabled={!user}
          >
            {reminderSet ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Attending - Click to Cancel
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                {user ? 'Set Reminder' : 'Login to Set Reminder'}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EventCountdown;
