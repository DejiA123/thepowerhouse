
import DepartmentCard, { Department } from "./DepartmentCard";
import { Music, Mic, Heart, Camera, Book, Handshake, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DepartmentsDirectoryProps {
  onJoinDepartment: (departmentName: string) => void;
}

const DepartmentsDirectory = ({ onJoinDepartment }: DepartmentsDirectoryProps) => {
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
      icon: <Music className="w-6 h-6" />,
      description: "Lead worship through music and song",
      members: memberCounts["Choir"] || 0,
      meetings: "Wednesdays 7:00 PM",
      leader: "Min Rekky Chigozie",
      requirements: "A heart of worship"
    },
    {
      id: "ushering",
      name: "Ushering",
      icon: <Handshake className="w-6 h-6" />,
      description: "Welcome and assist congregation members",
      members: memberCounts["Ushering"] || 0,
      meetings: "Monthly training sessions",
      leader: "Min Golden Chigozie",
      requirements: "Heart for hospitality"
    },
    {
      id: "evangelism",
      name: "Evangelism",
      icon: <Heart className="w-6 h-6" />,
      description: "Share the gospel in the community",
      members: memberCounts["Evangelism"] || 0,
      meetings: "Saturdays 2:00 PM",
      leader: "Min Golden Chigozie",
      requirements: "Passion for souls"
    },
    {
      id: "pastoral",
      name: "Pastoral Care",
      icon: <Users className="w-6 h-6" />,
      description: "Support and care for church members",
      members: memberCounts["Pastoral Care"] || 0,
      meetings: "Bi-weekly meetings",
      leader: "Pastor David Richman",
      requirements: "Mature in faith"
    },
    {
      id: "media",
      name: "Media Team",
      icon: <Camera className="w-6 h-6" />,
      description: "Manage audio, video, and live streaming",
      members: memberCounts["Media Team"] || 0,
      meetings: "Sundays 8:00 AM",
      leader: "TPH Social Team",
      requirements: "Technical skills helpful"
    },
    {
      id: "youth",
      name: "Youth Ministry",
      icon: <Users className="w-6 h-6" />,
      description: "Minister to teenagers and young adults",
      members: memberCounts["Youth Ministry"] || 0,
      meetings: "Fridays 7:00 PM",
      leader: "YP Sodiq Omoyayi",
      requirements: "Heart for young people"
    }
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {departments.map((dept) => (
        <DepartmentCard 
          key={dept.id} 
          department={dept}
          onJoin={onJoinDepartment}
        />
      ))}
    </div>
  );
};

export default DepartmentsDirectory;
