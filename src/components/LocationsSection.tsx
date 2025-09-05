
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Phone, Mail } from "lucide-react";

const LocationsSection = () => {
  const locations = [
    {
      name: "Galway",
      address: "The Power House International Church, Unit 22 Marangonii House, Monivea Rd, Ballybrit Heights, Galway, H91 958A",
      serviceTime: "Sunday 10:00 AM",
      phone: "089 953 4714",
      email: "contact.thepowerhouse@gmail.com"
    },
    {
      name: "Kildare",
      address: "Eyre St, Greatconnell, Newbridge, Co. Kildare",
      serviceTime: "Sunday 10:00 AM",
      phone: "089 953 5663",
      email: "contact.thepowerhouse@gmail.com"
    },
    {
      name: "Athlone",
      address: "Unit 22 Athlone Shopping Centre, Sean Costello Street, Athlone, Co. Westmeath, N37 V2Y2",
      serviceTime: "Sunday: 10:00 AM",
      phone: "089 982 2556",
      email: "contact.thepowerhouse@gmail.com"
    },
    {
      name: "Dublin",
      address: "Holiday Inn Express 28-32 O'Connell Street Upper, Rotunda Dublin 1, D01T2X2",
      serviceTime: "Sunday: 10:00 AM",
      phone: "089 252 7008",
      email: "contact.thepowerhouse@gmail.com"
    }
  ];

  return (
    <Card className="glass-card border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-primary" />
          <span>Our Locations</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {locations.map((location, index) => (
            <div key={index} className="p-4 bg-muted/50 rounded-lg border border-border">
              <h3 className="font-semibold text-lg mb-3 text-primary">{location.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{location.address}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{location.serviceTime}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{location.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{location.email}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`;
                window.open(url, '_blank');
              }}>
                Get Directions
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationsSection;
