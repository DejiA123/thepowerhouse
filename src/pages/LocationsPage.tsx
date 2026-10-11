import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Page, PageTitle } from "@/components/page/PageKit";
import LocationsSection from "@/components/LocationsSection";
import { TILE } from "@/data/appDirectory";

/** Find a church: our churches and their service times. */
const LocationsPage = () => {
  const navigate = useNavigate();
  return (
    <Page wide>
      <PageTitle
        icon={MapPin}
        tint={TILE.sky}
        title="Find a church"
        subtitle="Our churches and service times"
        back={{ label: "Church", onClick: () => navigate("/church") }}
      />
      <LocationsSection />
    </Page>
  );
};

export default LocationsPage;
