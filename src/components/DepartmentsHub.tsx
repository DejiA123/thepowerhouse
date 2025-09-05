
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users } from "lucide-react";
import GroupPinDialog from "./GroupPinDialog";
import GroupPage from "./GroupPage";
import DepartmentsDirectory from "./departments/DepartmentsDirectory";
import UpcomingMeetings from "./departments/UpcomingMeetings";
import SharedFiles from "./departments/SharedFiles";
import ServiceRotas from "./departments/ServiceRotas";

const DepartmentsHub = () => {
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinDepartment, setPinDepartment] = useState("");
  const [joinedGroup, setJoinedGroup] = useState<string | null>(null);

  const joinDepartment = (departmentName: string) => {
    setPinDepartment(departmentName);
    setShowPinDialog(true);
  };

  const handlePinSuccess = () => {
    setJoinedGroup(pinDepartment);
  };

  // If user has joined a group, show the group page
  if (joinedGroup) {
    return <GroupPage departmentName={joinedGroup} onBack={() => setJoinedGroup(null)} />;
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Departments & Ministry Teams</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="directory">
            <TabsList className="grid w-full grid-cols-4 bg-blue-50 dark:bg-gray-800">
              <TabsTrigger value="directory" className="text-gray-900 dark:text-gray-100 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Department
              </TabsTrigger>
              <TabsTrigger value="meetings" className="text-gray-900 dark:text-gray-100 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Meetings
              </TabsTrigger>
              <TabsTrigger value="files" className="text-gray-900 dark:text-gray-100 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Files
              </TabsTrigger>
              <TabsTrigger value="rotas" className="text-gray-900 dark:text-gray-100 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Rotas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="directory" className="space-y-4">
              <DepartmentsDirectory onJoinDepartment={joinDepartment} />
            </TabsContent>

            <TabsContent value="meetings" className="space-y-4"></TabsContent>

            <TabsContent value="files" className="space-y-4"></TabsContent>

            <TabsContent value="rotas" className="space-y-4"></TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <GroupPinDialog
        isOpen={showPinDialog}
        onClose={() => setShowPinDialog(false)}
        departmentName={pinDepartment}
        onSuccess={handlePinSuccess}
      />
    </div>
  );
};

export default DepartmentsHub;
