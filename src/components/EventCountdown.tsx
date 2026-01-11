
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
    <div className="relative overflow-hidden rounded-3xl p-1 group shadow-xl shadow-indigo-100/50">
      {/* Animated border gradient - lighter/softer for light mode */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 opacity-30 animate-pulse"></div>

      <Card className="relative border-0 shadow-none bg-white/80 backdrop-blur-xl text-gray-800 overflow-hidden rounded-[22px]">
        {/* Background decoration - lighter for light mode */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-100 rounded-full blur-3xl pointer-events-none opacity-40"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-100 rounded-full blur-3xl pointer-events-none opacity-40"></div>

        <CardHeader className="relative z-10 pb-2">
          <CardTitle className="flex items-center space-x-2 text-indigo-600">
            <Calendar className="w-5 h-5" />
            <span className="tracking-wide uppercase text-sm font-bold">Next Service Countdown</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="relative z-10 space-y-6">
          <div className="text-center">
            <h3 className="text-3xl md:text-4xl font-black text-gray-900 mb-2 tracking-tight">{upcomingEvent.title}</h3>
            <div className="flex items-center justify-center space-x-4 text-indigo-700 text-sm md:text-base bg-indigo-50/50 py-2 px-4 rounded-full inline-flex backdrop-blur-sm border border-indigo-100/50 shadow-sm">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 text-indigo-500" />
                <span>{upcomingEvent.time}</span>
              </div>
              <div className="w-px h-4 bg-indigo-200"></div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                <span>{upcomingEvent.location}</span>
              </div>
            </div>

            {isServiceHappeningNow() && (
              <div className="mt-4 animate-in fade-in zoom-in duration-500">
                <Badge className="bg-red-500 text-white animate-pulse px-4 py-1 text-sm shadow-md shadow-red-200 border-0">
                  🔴 LIVE NOW
                </Badge>
              </div>
            )}
          </div>

          {!isServiceHappeningNow() ? (
            <div className="grid grid-cols-4 gap-3 md:gap-4">
              {Object.entries(timeLeft).map(([unit, value]) => (
                <div key={unit} className="flex flex-col items-center justify-center bg-white border border-gray-100 rounded-2xl p-3 md:p-4 shadow-sm">
                  <span className="text-3xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-b from-indigo-500 to-purple-600">{value}</span>
                  <span className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">{unit}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-indigo-50 rounded-2xl border border-indigo-100">
              <p className="text-xl font-bold text-indigo-700 animate-pulse">Service is currently in progress!</p>
              <p className="text-sm text-gray-600 mt-1">Join us now for a powerful time.</p>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-sm px-1">
              <div className="flex items-center space-x-2 text-gray-600">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>
                  <span className="text-gray-900 font-bold">{attendees}</span> attending
                </span>
              </div>
              <div className="flex items-center">
                <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.round((attendees / upcomingEvent.capacity) * 100)}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-xs text-indigo-600 font-mono font-semibold">
                  {Math.round((attendees / upcomingEvent.capacity) * 100)}%
                </span>
              </div>
            </div>

            {!isServiceHappeningNow() && (
              <Button
                className={`w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all duration-300 transform active:scale-95 ${reminderSet
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0'
                    : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200/60'
                  }`}
                onClick={reminderSet ? removeAttendance : setReminder}
                disabled={!user}
              >
                {reminderSet ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Attending Confirmed
                  </>
                ) : (
                  <>
                    <Bell className="w-5 h-5 mr-2 text-indigo-600" />
                    {user ? 'Set Reminder' : 'Login to Set Reminder'}
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventCountdown;
