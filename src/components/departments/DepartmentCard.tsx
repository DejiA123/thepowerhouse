
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, UserPlus } from "lucide-react";

export interface Department {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  members: number;
  meetings: string;
  leader: string;
  requirements: string;
}

interface DepartmentCardProps {
  department: Department;
  onJoin: (departmentName: string) => void;
}

const DepartmentCard = ({ department, onJoin }: DepartmentCardProps) => {
  return (
    <Card className="border border-blue-100 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="text-blue-600">
            {department.icon}
          </div>
          <div>
            <h3 className="font-semibold">{department.name}</h3>
            <Badge variant="outline" className="text-xs">
              {department.members} members
            </Badge>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-3">{department.description}</p>
        
        <div className="space-y-2 text-xs text-muted-foreground mb-4">
          <div className="flex items-center">
            <Calendar className="w-3 h-3 mr-2" />
            {department.meetings}
          </div>
          <div className="flex items-center">
            <Users className="w-3 h-3 mr-2" />
            Led by {department.leader}
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-xs font-medium">Requirements:</p>
          <p className="text-xs text-muted-foreground">{department.requirements}</p>
          <Button 
            size="sm" 
            className="w-full mt-3"
            onClick={() => onJoin(department.name)}
          >
            <UserPlus className="w-3 h-3 mr-2" />
            Join Department
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DepartmentCard;
