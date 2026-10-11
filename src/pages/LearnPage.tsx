import { useNavigate } from "react-router-dom";
import { GraduationCap, Lightbulb } from "lucide-react";
import { ListGroup, ListRow, Page, PageTitle, SectionLabel } from "@/components/page/PageKit";
import { PlaceRow, RowPicture } from "@/components/nav/Places";
import { SESSIONS } from "@/data/resourceCatalog";
import { TILE } from "@/data/appDirectory";

/** Learn: Bible plans, studies and notes, in one place. */
const LearnPage = () => {
  const navigate = useNavigate();

  return (
    <Page>
      <PageTitle
        icon={GraduationCap}
        tint={TILE.violet}
        title="Learn"
        subtitle="Grow in the Word, a little every day"
        back={{ label: "Me", onClick: () => navigate("/me") }}
      />

      <ListGroup>
        <PlaceRow id="plans" />
        <PlaceRow id="notes" />
        <PlaceRow id="listen" />
      </ListGroup>

      <SectionLabel>Bible studies</SectionLabel>
      <ListGroup>
        {SESSIONS.map((s) => (
          <ListRow
            key={s.name}
            leading={<RowPicture icon={Lightbulb} color="amber" />}
            title={s.name}
            subtitle={s.description}
            onClick={() => navigate(`/resources?session=${encodeURIComponent(s.name)}`)}
            chevron
            className="min-h-[68px] py-3"
          />
        ))}
      </ListGroup>

      <SectionLabel>For the choir and band</SectionLabel>
      <ListGroup>
        <PlaceRow id="choir-singing" />
        <PlaceRow id="choir-basics" />
      </ListGroup>
    </Page>
  );
};

export default LearnPage;
