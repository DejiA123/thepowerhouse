import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Shield, UserPlus, UserMinus, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type ChurchRole = 'choir' | 'administrator' | 'usher' | 'pastor' | 'campus_fellowship';

interface UserRole {
  id: string;
  user_id: string;
  role: ChurchRole;
  assigned_at: string;
  is_active: boolean;
  profiles?: {
    full_name: string;
    email: string;
  };
}

// Add prop type for onRolesChanged
interface UserRoleManagerProps {
  onRolesChanged?: () => void;
}

const UserRoleManager = ({ onRolesChanged }: UserRoleManagerProps) => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<ChurchRole>('choir');
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  const roleLabels: Record<ChurchRole, string> = {
    choir: 'Choir Member',
    administrator: 'Administrator',
    usher: 'Usher',
    pastor: 'Pastor',
    campus_fellowship: 'Campus Fellowship'
  };

  const roleColors: Record<ChurchRole, string> = {
    choir: 'bg-blue-100 text-blue-800',
    administrator: 'bg-red-100 text-red-800',
    usher: 'bg-green-100 text-green-800',
    pastor: 'bg-purple-100 text-purple-800',
    campus_fellowship: 'bg-orange-100 text-orange-800'
  };

  const rolePins: Record<ChurchRole, string> = {
    choir: '1111',
    administrator: '2222',
    usher: '3333',
    pastor: '4444',
    campus_fellowship: '5555',
  };

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  useEffect(() => {
    if (user && isAdmin !== undefined) {
      fetchUserRoles();
    }
  }, [user, isAdmin]);

  const checkAdminStatus = async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .eq('is_active', true)
      .in('role', ['administrator', 'pastor']);

    if (data && data.length > 0) {
      setIsAdmin(true);
    }
  };

  const fetchUserRoles = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      if (isAdmin) {
        // For admins, fetch all users with roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('is_active', true)
          .order('assigned_at', { ascending: false });
        
        if (rolesError) throw rolesError;
        
        if (rolesData && rolesData.length > 0) {
          // Get unique user IDs
          const userIds = [...new Set(rolesData.map(role => role.user_id))];
          
          // Fetch profiles for all users
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);
          
          if (profilesError) throw profilesError;
          
          // Combine roles with profiles
          const combinedData = rolesData.map(role => {
            const profile = profilesData?.find(p => p.id === role.user_id);
            return {
              ...role,
              profiles: profile ? {
                full_name: profile.full_name,
                email: profile.email
              } : undefined
            };
          });
          
          setUserRoles(combinedData);
        } else {
          setUserRoles([]);
        }
      } else {
        // For regular users, only fetch their own roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('assigned_at', { ascending: false });
        
        if (rolesError) throw rolesError;
        
        if (rolesData && rolesData.length > 0) {
          // Fetch profile for current user
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', user.id)
            .single();
          
          if (profileError) throw profileError;
          
          // Combine roles with profile
          const combinedData = rolesData.map(role => ({
            ...role,
            profiles: profileData ? {
              full_name: profileData.full_name,
              email: profileData.email
            } : undefined
          }));
          
          setUserRoles(combinedData);
        } else {
          setUserRoles([]);
        }
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setUserRoles([]);
    }
    
    setIsLoading(false);
  };

  const assignRole = async () => {
    if (!userEmail || !selectedRole) {
      toast({
        title: "Missing Information",
        description: "Please enter user email and select a role",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail.toLowerCase())
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      // Check if role already exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userData.id)
        .eq('role', selectedRole)
        .eq('is_active', true)
        .single();

      if (existingRole) {
        throw new Error('User already has this role');
      }

      // Assign the role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userData.id,
          role: selectedRole,
          assigned_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Role Assigned",
        description: `${roleLabels[selectedRole]} role assigned to ${userEmail}`,
      });

      setUserEmail('');
      fetchUserRoles();
      if (onRolesChanged) onRolesChanged();

    } catch (error: any) {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign role",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeRole = async (roleId: string, userEmail: string, role: ChurchRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: "Role Removed",
        description: `${roleLabels[role]} role removed from ${userEmail}`,
      });

      fetchUserRoles();
      if (onRolesChanged) onRolesChanged();

    } catch (error: any) {
      toast({
        title: "Removal Failed",
        description: error.message || "Failed to remove role",
        variant: "destructive"
      });
    }
  };

  // For non-admin users, show a simplified version to assign roles to themselves
  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Select Your Church Role</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Church Role</Label>
            <Select value={selectedRole} onValueChange={(value: ChurchRole) => setSelectedRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 mt-2">
            <Label>Role PIN</Label>
            <Input
              type="password"
              placeholder="Enter PIN for selected role"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={8}
            />
            {pinError && <p className="text-red-500 text-xs mt-1">{pinError}</p>}
          </div>
          <Button 
            onClick={async () => {
              setPinError('');
              if (!user || !selectedRole) return;
              if (pin !== rolePins[selectedRole]) {
                setPinError('Incorrect PIN for selected role');
                return;
              }
              setIsLoading(true);
              try {
                // Fetch latest roles from DB before checking for duplicates
                const { data: latestRoles, error: fetchError } = await supabase
                  .from('user_roles')
                  .select('*')
                  .eq('user_id', user.id)
                  .eq('role', selectedRole);
                if (fetchError) throw fetchError;
                // If an active role exists, block
                if (latestRoles.some((r: any) => r.is_active)) {
                  toast({
                    title: "Already Assigned",
                    description: `You already have the ${roleLabels[selectedRole]} role`,
                    variant: "destructive"
                  });
                  setIsLoading(false);
                  return;
                }
                // If a soft-deleted role exists, reactivate it
                const inactiveRole = latestRoles.find((r: any) => !r.is_active);
                if (inactiveRole) {
                  const { error: updateError } = await supabase
                    .from('user_roles')
                    .update({ is_active: true })
                    .eq('id', inactiveRole.id);
                  if (updateError) throw updateError;
                  toast({
                    title: "Role Re-Assigned",
                    description: `You have been re-assigned the ${roleLabels[selectedRole]} role`,
                  });
                  setPin('');
                  fetchUserRoles();
                  await checkAdminStatus();
                  if (onRolesChanged) onRolesChanged();
                  setIsLoading(false);
                  return;
                }
                // Otherwise, insert a new row
                const { error } = await supabase
                  .from('user_roles')
                  .insert({
                    user_id: user.id,
                    role: selectedRole,
                    assigned_by: user.id
                  });
                if (error) {
                  if (error.code === '23505' || (error.message && error.message.includes('duplicate'))) {
                    toast({
                      title: "Already Assigned",
                      description: `You already have the ${roleLabels[selectedRole]} role`,
                      variant: "destructive"
                    });
                  } else {
                    toast({
                      title: "Assignment Failed",
                      description: error.message || "Failed to assign role",
                      variant: "destructive"
                    });
                  }
                } else {
                  toast({
                    title: "Role Assigned",
                    description: `You have been assigned the ${roleLabels[selectedRole]} role`,
                  });
                  setPin('');
                  fetchUserRoles();
                  await checkAdminStatus();
                  if (onRolesChanged) onRolesChanged();
                }
              } catch (error: any) {
                toast({
                  title: "Assignment Failed",
                  description: error.message || "Failed to assign role",
                  variant: "destructive"
                });
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading || !selectedRole || !pin}
            className="w-full"
          >
            {isLoading ? "Assigning..." : "Assign Role to Myself"}
          </Button>
          {/* Show current user roles */}
          <h4 className="font-medium mb-3 mt-6">Your Current Roles</h4>
          {userRoles.filter(role => role.user_id === user?.id).length === 0 ? (
            <p className="text-muted-foreground text-sm">No roles assigned yet</p>
          ) : (
            <div className="space-y-2">
              {userRoles.filter(role => role.user_id === user?.id).map((userRole) => (
                <Badge key={userRole.id} className={roleColors[userRole.role]}>
                  {roleLabels[userRole.role]}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Always show current user roles at the top
  const userOwnRoles = userRoles.filter(role => role.user_id === user?.id && role.is_active);

  return (
    <div className="space-y-6">
      {/* Show current user roles as badges at the top */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>My Roles</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userOwnRoles.length === 0 ? (
            <p className="text-muted-foreground text-sm">No roles assigned yet</p>
          ) : (
            <div className="space-x-2 mb-2">
              {userOwnRoles.map((userRole) => (
                <Badge
                  key={userRole.id}
                  className={
                    userRole.role === 'administrator'
                      ? `${roleColors[userRole.role]} border-2 border-red-500 text-lg px-4 py-2`
                      : roleColors[userRole.role]
                  }
                >
                  {roleLabels[userRole.role]}
                </Badge>
              ))}
            </div>
          )}
          {isAdmin && (
            <div className="mt-2 text-green-700 font-semibold">
              You are an <span className="font-bold">Administrator</span>. You have access to all admin features.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Assignment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5" />
            <span>Assign Church Role</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>User Email</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Church Role</Label>
              <Select value={selectedRole} onValueChange={(value: ChurchRole) => setSelectedRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={assignRole}
                disabled={isLoading || !userEmail || !selectedRole}
                className="w-full"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Assign Role
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Roles List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Church Members & Roles</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userRoles.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No roles assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userRoles.map((userRole) => (
                <div
                  key={userRole.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div>
                      <div className="font-medium">
                        {userRole.profiles?.full_name || 'Unknown User'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {userRole.profiles?.email}
                      </div>
                    </div>
                    <Badge className={roleColors[userRole.role]}>
                      {roleLabels[userRole.role]}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeRole(
                      userRole.id,
                      userRole.profiles?.email || '',
                      userRole.role
                    )}
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Church Role Descriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <Badge className={roleColors.pastor}>Pastor</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Full administrative access, can manage all church functions
                </p>
              </div>
              <div>
                <Badge className={roleColors.administrator}>Administrator</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Can manage announcements, users, and church content
                </p>
              </div>
              <div>
                <Badge className={roleColors.usher}>Usher</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Helps with service coordination and hospitality
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Badge className={roleColors.choir}>Choir Member</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Part of the worship team and music ministry
                </p>
              </div>
              <div>
                <Badge className={roleColors.campus_fellowship}>Campus Fellowship</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Focuses on student ministry and campus outreach
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserRoleManager;