import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ClipboardList, FolderOpen } from "lucide-react";
import DepartmentsDirectory from "./departments/DepartmentsDirectory";
import { EmptyState, PageHeader, Segmented } from "@/components/page/PageKit";

type Tab = "teams" | "meetings" | "rotas" | "files";

const DepartmentsHub = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("teams");

  return (
    <div>
      <PageHeader title="Ministry Hub" back={{ label: "Resources", onClick: () => navigate("/resources") }} />

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "teams", label: "Teams" },
          { value: "meetings", label: "Meetings" },
          { value: "rotas", label: "Rotas" },
          { value: "files", label: "Files" },
        ]}
      />

      <div className="animate-in fade-in duration-200">
        {tab === "teams" && <DepartmentsDirectory />}
        {tab === "meetings" && (
          <EmptyState icon={CalendarDays} title="No upcoming meetings">
            Open your team to see its meetings and messages.
          </EmptyState>
        )}
        {tab === "rotas" && (
          <EmptyState icon={ClipboardList} title="No rotas yet">
            Service schedules and duty rosters will be listed here.
          </EmptyState>
        )}
        {tab === "files" && (
          <EmptyState icon={FolderOpen} title="No shared files">
            Team documents and resources will appear here.
          </EmptyState>
        )}
      </div>
    </div>
  );
};

export default DepartmentsHub;
