import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, MessageSquare, FileText, ArrowLeft } from "lucide-react";
import GroupChatComponent from "./GroupChatComponent";
import { useGroupChat } from "@/hooks/useGroupChat";

interface GroupPageProps {
  departmentName: string;
  onBack: () => void;
}

const GroupPage = ({ departmentName, onBack }: GroupPageProps) => {
  const {
    members,
    memberCount,
    isMember,
    joinGroup,
    leaveGroup,
    user
  } = useGroupChat(departmentName);

  // Add debug log for members
  console.log('Group members:', members);
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold gradient-text">{departmentName} Group</h1>
        <Badge variant="secondary">{memberCount} Member{memberCount === 1 ? '' : 's'}</Badge>
        {user && (
          isMember ? (
            <Button variant="destructive" size="sm" onClick={leaveGroup}>Leave</Button>
          ) : (
            <Button variant="default" size="sm" onClick={joinGroup}>Join</Button>
          )
        )}
      </div>

      {/* Member List */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Group Members</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.length === 0 ? (
              <span className="text-muted-foreground text-sm">No members yet</span>
            ) : (
              members.map((member, index) => (
                <div key={member.user_id || index} className="flex items-center space-x-2 p-2 bg-muted/50 rounded">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm">
                    {member.profiles?.full_name?.charAt(0) || member.user_id?.charAt(0) || '?'}
                  </div>
                  <span className="text-sm">{member.profiles?.full_name || `User ${member.user_id?.substring(0, 8)}`}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Only show the group chat, not sample members/events/files */}
      <GroupChatComponent groupName={departmentName} />
    </div>
  );
};

export default GroupPage;
