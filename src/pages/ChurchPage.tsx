import { Church, Globe } from "lucide-react";
import { ListGroup, ListRow, Page, PageTitle, SectionLabel } from "@/components/page/PageKit";
import { PlaceRow, PlaceTile, RowPicture } from "@/components/nav/Places";
import { TILE } from "@/data/appDirectory";

/** Church: services, events, giving and prayer, then everything else about the church. */
const ChurchPage = () => (
  <Page wide>
    <PageTitle icon={Church} tint={TILE.sky} title="Church" subtitle="Services, events, giving and prayer" />

    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <PlaceTile id="watch" />
      <PlaceTile id="events" />
      <PlaceTile id="give" />
      <PlaceTile id="prayer" />
    </div>

    <SectionLabel>More</SectionLabel>
    <ListGroup>
      <PlaceRow id="new" />
      <PlaceRow id="locations" />
      <PlaceRow id="campus" />
      <PlaceRow id="building" />
      <PlaceRow id="feedback" />
      <PlaceRow id="social-media" />
      <ListRow
        leading={<RowPicture icon={Globe} color="slate" />}
        title="Our website"
        subtitle="thepowerhouseinternational.org"
        href="https://www.thepowerhouseinternational.org/"
        chevron
        className="min-h-[68px] py-3"
      />
    </ListGroup>
  </Page>
);

export default ChurchPage;
