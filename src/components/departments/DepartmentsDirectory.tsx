
import { Department } from "./DepartmentCard";
import { Music, Mic, Heart, Camera, Book, Handshake, Users, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface DepartmentsDirectoryProps {
  onJoinDepartment: (departmentName: string) => void;
}

const DepartmentsDirectory = ({ onJoinDepartment }: DepartmentsDirectoryProps) => {
  const navigate = useNavigate();
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchCounts = async () => {
      // @ts-ignore: group_members is a new table
      const { data, error } = await supabase
        .from('group_members')
        .select('group_name, user_id');
      if (!error && data) {
        const counts: Record<string, number> = {};
        data.forEach((row: any) => {
          counts[row.group_name] = (counts[row.group_name] || 0) + 1;
        });
        setMemberCounts(counts);
      }
    };
    fetchCounts();
  }, []);

  const departments: Department[] = [
    {
      id: "choir",
      name: "Choir",
      icon: <Music className="w-5 h-5 text-white" />,
      description: "Lead worship through music and song",
      members: memberCounts["Choir"] || 12,
      meetings: "Wednesdays 7:00 PM",
      leader: "Min Rekky Chigozie",
      requirements: "A heart of worship",
      color: "bg-pink-500"
    },
    {
      id: "ushering",
      name: "Ushering",
      icon: <Handshake className="w-5 h-5 text-white" />,
      description: "Welcome and assist congregation members",
      members: memberCounts["Ushering"] || 8,
      meetings: "Monthly training sessions",
      leader: "Min Golden Chigozie",
      requirements: "Heart for hospitality",
      color: "bg-purple-500"
    },
    {
      id: "evangelism",
      name: "Evangelism",
      icon: <Heart className="w-5 h-5 text-white" />,
      description: "Share the gospel in the community",
      members: memberCounts["Evangelism"] || 15,
      meetings: "Saturdays 2:00 PM",
      leader: "Min Golden Chigozie",
      requirements: "Passion for souls",
      color: "bg-red-500"
    },
    {
      id: "pastoral",
      name: "Pastoral Care",
      icon: <Users className="w-5 h-5 text-white" />,
      description: "Support and care for church members",
      members: memberCounts["Pastoral Care"] || 5,
      meetings: "Bi-weekly meetings",
      leader: "Pastor David Richman",
      requirements: "Mature in faith",
      color: "bg-blue-500"
    },
    {
      id: "media",
      name: "Media Team",
      icon: <Camera className="w-5 h-5 text-white" />,
      description: "Manage audio, video, and live streaming",
      members: memberCounts["Media Team"] || 6,
      meetings: "Sundays 8:00 AM",
      leader: "TPH Social Team",
      requirements: "Technical skills helpful",
      color: "bg-orange-500"
    },
    {
      id: "youth",
      name: "Youth Ministry",
      icon: <Users className="w-5 h-5 text-white" />,
      description: "Minister to teenagers and young adults",
      members: memberCounts["Youth Ministry"] || 25,
      meetings: "Fridays 7:00 PM",
      leader: "YP Sodiq Omoyayi",
      requirements: "Heart for young people",
      color: "bg-green-500"
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="divide-y divide-gray-50 dark:divide-gray-700">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
            onClick={() => {
              if (dept.name === "Choir") {
                navigate("/groups/choir");
              } else {
                onJoinDepartment(dept.name);
              }
            }}
          >
            {/* Avatar */}
            <div className={`w-12 h-12 rounded-full ${dept.color || 'bg-blue-500'} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
              {dept.icon}
            </div>

            {/* Content */}
            <div className="flex-1 ml-4 min-w-0">
              <div className="flex justify-between items-start">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate pr-2">
                  {dept.name}
                </h3>
                {/* Time/Meta - optional, mimicking chat timestamps */}
                <span className="text-[10px] text-gray-400 shrink-0 hidden sm:inline-block">
                  {dept.members} members
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {dept.description}
              </p>
            </div>

            {/* Action */}
            <div className="ml-4 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 font-semibold px-5 h-8 text-xs"
              >
                Join
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartmentsDirectory;

// Extend the Department interface locally if needed since we aren't using the card anymore
// but for type safety we can define it here if the imported one is insufficient
declare module "./DepartmentCard" {
  interface Department {
    color?: string;
  }
}
