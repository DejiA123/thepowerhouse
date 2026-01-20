
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Phone, Mail, MessageCircle, ArrowRight } from "lucide-react";


const LocationsSection = () => {
  const locations = [
    {
      name: "Galway",
      address: "The Power House International Church, Unit 22 Marangonii House, Monivea Rd, Ballybrit, Galway, H91 958A",
      times: {
        sunday: "10 AM",
        bibleStudy: "7 PM",
        prayer: "7 PM"
      },
      phone: "089 953 4714",
      email: "contact.thepowerhouse@gmail.com",
      whatsappGroup: "https://chat.whatsapp.com/GalwayGroup"
    },
    {
      name: "Kildare",
      address: "The Power House International, O'Cola House Lower Eyre Street, Newbridge, W12TK37",
      times: {
        sunday: "10 AM",
        bibleStudy: "7 PM",
        prayer: "7 PM"
      },
      phone: "089 953 5663",
      email: "contact.thepowerhouse@gmail.com",
      whatsappGroup: "https://chat.whatsapp.com/KildareGroup"
    },
    {
      name: "Athlone",
      address: "Unit 22 Athlone Shopping Centre, Sean Costello Street, Athlone, Co. Westmeath, N37 V2Y2",
      times: {
        sunday: "10 AM",
        bibleStudy: "7 PM",
        prayer: "7 PM"
      },
      phone: "089 982 2556",
      email: "contact.thepowerhouse@gmail.com",
      whatsappGroup: "https://chat.whatsapp.com/AthloneGroup"
    },
    {
      name: "Dublin",
      address: "Holiday Inn Express 28-32 O'Connell Street Upper, Rotunda Dublin 1, D01T2X2",
      times: {
        sunday: "10 AM",
        bibleStudy: "8 PM",
        prayer: "8 PM"
      },
      phone: "089 252 7008",
      email: "contact.thepowerhouse@gmail.com",
      whatsappGroup: "https://chat.whatsapp.com/DublinGroup"
    }
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl p-1 group shadow-xl shadow-indigo-100/50">
      {/* Animated border gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 opacity-30 animate-pulse"></div>

      <Card className="relative border-0 shadow-none bg-white/80 backdrop-blur-xl text-gray-800 overflow-hidden rounded-[22px]">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-100 rounded-full blur-3xl pointer-events-none opacity-40"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-100 rounded-full blur-3xl pointer-events-none opacity-40"></div>

        <CardHeader className="relative z-10 pb-2 border-b border-indigo-100/50 mb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-indigo-600">
              <MapPin className="w-6 h-6" />
              <span className="tracking-wide font-bold">Our Locations</span>
            </div>

          </CardTitle>
        </CardHeader>

        <CardContent className="relative z-10">
          <div className="grid md:grid-cols-2 gap-6">
            {locations.map((location, index) => (
              <div key={index} className="group/card relative overflow-hidden rounded-2xl bg-white border border-indigo-50 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                    {location.name}
                  </h3>
                  <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover/card:bg-indigo-600 group-hover/card:text-white transition-colors">
                    <MapPin className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start space-x-2.5 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" />
                    <span className="leading-relaxed">{location.address}</span>
                  </div>

                  <div className="bg-gray-50/80 rounded-xl p-3 space-y-2 border border-gray-100">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-500 flex items-center"><Clock className="w-3 h-3 mr-1.5" /> Sunday Service</span>
                      <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">{location.times.sunday}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-500 flex items-center"><Clock className="w-3 h-3 mr-1.5" /> Bible Study</span>
                      <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">{location.times.bibleStudy}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-500 flex items-center"><Clock className="w-3 h-3 mr-1.5" /> Prayer Meeting</span>
                      <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">{location.times.prayer}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-semibold hover:bg-green-50 hover:text-green-700 hover:border-green-200 transaction-colors"
                      onClick={() => window.open(location.whatsappGroup, '_blank')}
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      className="w-full text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-200 border-0"
                      onClick={() => {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`;
                        window.open(url, '_blank');
                      }}
                    >
                      <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                      Directions
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationsSection;
