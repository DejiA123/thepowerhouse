import { Users } from "lucide-react";
import DepartmentsDirectory from "./departments/DepartmentsDirectory";
import { ListGroup, PageTitle, SectionLabel } from "@/components/page/PageKit";
import { PlaceRow } from "@/components/nav/Places";
import { TILE } from "@/data/appDirectory";

/** Teams: your team, every team, and how to join one. */
const DepartmentsHub = () => (
  <div>
    <PageTitle icon={Users} tint={TILE.green} title="Teams" subtitle="Find your team, practise and serve" />

    <DepartmentsDirectory />

    <SectionLabel>Want to help?</SectionLabel>
    <ListGroup>
      <PlaceRow id="serve" />
      <PlaceRow id="team-follow" />
    </ListGroup>
  </div>
);

export default DepartmentsHub;
