
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Clock, Phone, Mail, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LocationSelector = () => {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const { toast } = useToast();

  const locations = [
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
      coordinates: { lat: 53.353, lng: -6.263 }
    },
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
      coordinates: { lat: 53.295, lng: -8.997 }
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
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-primary" />
          <span>Select Your Location</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex space-x-3">
          <Select value={selectedLocation} onValueChange={handleLocationSelect}>
            <SelectTrigger className="flex-1">
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
          <Button variant="outline" onClick={recommendNearestLocation}>
            <Navigation className="w-4 h-4 mr-2" />
            Find Nearest
          </Button>
        </div>

        {currentLocation && (
          <Card className="bg-accent">
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-3 text-primary">{currentLocation.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{currentLocation.address}</span>
                </div>
                <div className="space-y-1 pl-6">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3 h-3 text-primary/70" />
                    <span className="text-muted-foreground">Sunday Service: {currentLocation.times.sunday}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3 h-3 text-primary/70" />
                    <span className="text-muted-foreground">Bible Study: {currentLocation.times.bibleStudy}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3 h-3 text-primary/70" />
                    <span className="text-muted-foreground">Prayer Meeting: {currentLocation.times.prayer}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{currentLocation.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{currentLocation.email}</span>
                </div>
              </div>
              <Button
                className="w-full mt-4"
                onClick={() => handleGetDirections(currentLocation)}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Get Directions
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground">
          Your selected location will be saved for future visits
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationSelector;
