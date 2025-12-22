
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, FolderOpen, ClipboardList } from "lucide-react";
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
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center space-x-3 px-1">
        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">Ministry Hub</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Connect and serve with your team</p>
        </div>
      </div>

      <Tabs defaultValue="directory" className="w-full">
        {/* Modern Pill Navigation */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <TabsList className="h-auto p-1 bg-gray-100/80 dark:bg-gray-800 rounded-full inline-flex w-auto min-w-full sm:min-w-0 justify-start">
            <TabsTrigger
              value="directory"
              className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all text-gray-500 hover:text-gray-900"
            >
              Departments
            </TabsTrigger>
            <TabsTrigger
              value="meetings"
              className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all text-gray-500 hover:text-gray-900"
            >
              Meetings
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all text-gray-500 hover:text-gray-900"
            >
              Files
            </TabsTrigger>
            <TabsTrigger
              value="rotas"
              className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all text-gray-500 hover:text-gray-900"
            >
              Rotas
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-4 min-h-[300px]">
          <TabsContent value="directory" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <DepartmentsDirectory onJoinDepartment={joinDepartment} />
          </TabsContent>

          <TabsContent value="meetings" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-3 shadow-sm">
                <Calendar className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">No Upcoming Meetings</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Join a department to see their scheduled meetings here.</p>
            </div>
          </TabsContent>

          <TabsContent value="files" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-3 shadow-sm">
                <FolderOpen className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">No Shared Files</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Department resources and documents will appear here.</p>
            </div>
          </TabsContent>

          <TabsContent value="rotas" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-3 shadow-sm">
                <ClipboardList className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">No Active Rotas</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Service schedules and duty rosters will be listed here.</p>
            </div>
          </TabsContent>
        </div>
      </Tabs>

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
