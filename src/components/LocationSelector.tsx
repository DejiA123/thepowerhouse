
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Clock, Phone, Mail, Navigation, MessageCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const LocationSelector = () => {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const { toast } = useToast();

  const locations = [
    {
      id: "galway",
      name: "Galway",
      address: "The Power House International Church, Unit 22 Marangonii House, Monivea Rd, Ballybrit, Galway, H91 958A",
      times: {
        sunday: "10 AM",
        bibleStudy: "7 PM",
        prayer: "7 PM"
      },
      phone: "089 953 4714",
      email: "contact.thepowerhouse@gmail.com",
      whatsappGroup: "https://chat.whatsapp.com/GalwayGroup",
      coordinates: { lat: 53.295, lng: -8.997 }
    },
    {
      id: "dublin",
      name: "Dublin",
      address: "Holiday Inn Express 28-32 O'Connell Street Upper, Rotunda Dublin 1, D01T2X2",
      times: {
        sunday: "10 AM",
        bibleStudy: "8 PM",
        prayer: "8 PM"
      },
      phone: "089 252 7008",
      email: "contact.thepowerhouse@gmail.com",
      whatsappGroup: "https://chat.whatsapp.com/DublinGroup",
      coordinates: { lat: 53.353, lng: -6.263 }
    },
    {
      id: "kildare",
      name: "Kildare",
      address: "The Power House International, O'Cola House Lower Eyre Street, Newbridge, W12TK37",
      times: {
        sunday: "10 AM",
        bibleStudy: "7 PM",
        prayer: "7 PM"
      },
      phone: "089 953 5663",
      email: "contact.thepowerhouse@gmail.com",
      whatsappGroup: "https://chat.whatsapp.com/KildareGroup",
      coordinates: { lat: 53.179, lng: -6.800 }
    },
    {
      id: "athlone",
      name: "Athlone",
      address: "Unit 22 Athlone Shopping Centre, Sean Costello Street, Athlone, Co. Westmeath, N37 V2Y2",
      times: {
        sunday: "10 AM",
        bibleStudy: "7 PM",
        prayer: "7 PM"
      },
      phone: "089 982 2556",
      email: "contact.thepowerhouse@gmail.com",
      whatsappGroup: "https://chat.whatsapp.com/AthloneGroup",
      coordinates: { lat: 53.4239, lng: -7.9407 }
    }
  ];

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocation(locationId);
    const location = locations.find(l => l.id === locationId);
    if (location) {
      localStorage.setItem('selected_location', locationId);
      toast({
        title: "Location Selected",
        description: `${location.name} is now your preferred location`,
      });
    }
  };

  const handleGetDirections = (location: any) => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.coordinates.lat},${location.coordinates.lng}`;
    window.open(googleMapsUrl, '_blank');
  };

  const recommendNearestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;

          let nearestLocation = locations[0];
          let shortestDistance = calculateDistance(userLat, userLng, nearestLocation.coordinates.lat, nearestLocation.coordinates.lng);

          locations.forEach(location => {
            const distance = calculateDistance(userLat, userLng, location.coordinates.lat, location.coordinates.lng);
            if (distance < shortestDistance) {
              shortestDistance = distance;
              nearestLocation = location;
            }
          });

          setSelectedLocation(nearestLocation.id);
          toast({
            title: "Nearest Location Found",
            description: `${nearestLocation.name} is closest to you (${shortestDistance.toFixed(1)}km away)`,
          });
        },
        () => {
          toast({
            title: "Location Access Denied",
            description: "Please select your location manually",
            variant: "destructive"
          });
        }
      );
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const currentLocation = locations.find(l => l.id === selectedLocation);

  return (
    <div className="relative overflow-hidden rounded-3xl group shadow-lg dark:shadow-black/20">
      <Card className="relative border border-gray-100 dark:border-gray-800 shadow-none bg-white dark:bg-gray-900 overflow-hidden rounded-3xl">

        <CardHeader className="relative z-10 pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-400">
              <MapPin className="w-5 h-5" />
              <span className="tracking-wide font-bold">Find Your Church</span>
            </div>
            {currentLocation && (
              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                {currentLocation.name}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 relative z-10">
          <div className="flex space-x-3">
            <Select value={selectedLocation} onValueChange={handleLocationSelect}>
              <SelectTrigger className="flex-1 rounded-xl h-12 border-blue-100 dark:border-blue-900/50 bg-white dark:bg-gray-800 shadow-sm focus:ring-blue-500">
                <SelectValue placeholder="Choose your nearest location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={recommendNearestLocation}
              className="rounded-xl h-12 px-6 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Nearest
            </Button>
          </div>

          {currentLocation && (
            <div className="group/card relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-900/50 p-6 shadow-xl shadow-blue-900/5 animate-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-cyan-600 dark:from-blue-400 dark:to-cyan-400">
                  {currentLocation.name}
                </h3>
                <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <MapPin className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-start space-x-3 text-sm text-gray-600 dark:text-gray-300">
                  <MapPin className="w-5 h-5 mt-0.5 shrink-0 text-blue-400" />
                  <span className="leading-relaxed font-medium">{currentLocation.address}</span>
                </div>

                <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-4 space-y-3 border border-blue-100/50 dark:border-blue-900/20">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center"><Clock className="w-4 h-4 mr-2 text-blue-400" /> Sunday Service</span>
                    <span className="text-blue-700 dark:text-blue-300 font-bold bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm">{currentLocation.times.sunday}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center"><Clock className="w-4 h-4 mr-2 text-blue-400" /> Bible Study</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm">{currentLocation.times.bibleStudy}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center"><Clock className="w-4 h-4 mr-2 text-blue-400" /> Prayer Meeting</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm">{currentLocation.times.prayer}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors cursor-pointer">
                      <Phone className="w-4 h-4 text-blue-400" />
                      <span className="font-medium">{currentLocation.phone}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors cursor-pointer">
                    <Mail className="w-4 h-4 text-blue-400" />
                    <span className="font-medium truncate">{currentLocation.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="w-full font-semibold hover:bg-green-50 hover:text-green-700 hover:border-green-200 dark:hover:bg-green-900/20 dark:hover:text-green-400 dark:hover:border-green-900 transition-all rounded-xl h-11"
                    onClick={() => window.open(currentLocation.whatsappGroup, '_blank')}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    className="w-full font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/30 border-0 rounded-xl h-11 transition-all hover:scale-[1.02]"
                    onClick={() => handleGetDirections(currentLocation)}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Directions
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationSelector;
