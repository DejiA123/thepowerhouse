import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, User, Mail, Trash2, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import UserRoleManager from "@/components/UserRoleManager";
import MFAEnrollmentDialog from "@/components/MFAEnrollmentDialog";

interface AccountSettingsProps {
  onBack: () => void;
}

export const AccountSettings = ({ onBack }: AccountSettingsProps) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState({
    full_name: '',
    email: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showMFAEnrollment, setShowMFAEnrollment] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadProfile();
      checkMFAStatus();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          email: data.email || user?.email || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const checkMFAStatus = async () => {
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const totpFactors = data?.totp || [];
      setMfaFactors(totpFactors);
      setMfaEnabled(totpFactors.length > 0);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    }
  };

  const handleDisableMFA = async (factorId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });

      if (error) throw error;

      toast({
        title: "MFA Disabled",
        description: "Two-factor authentication has been disabled",
      });

      await checkMFAStatus();
    } catch (error) {
      console.error('Error disabling MFA:', error);
      toast({
        title: "Error",
        description: "Failed to disable MFA",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMFAEnrollmentSuccess = async () => {
    toast({
      title: "Success",
      description: "Two-factor authentication has been enabled",
    });
    await checkMFAStatus();
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Only update fields that exist in the profiles table
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          email: profile.email,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }


      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmation !== 'DELETE') return;

    setLoading(true);
    try {
      // Delete user data from profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      // Delete user preferences
      await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', user.id);

      // Note: user_notification_preferences table doesn't exist in current schema
      // so we skip that deletion

      // For now, just sign out since we can't delete the auth user without admin privileges
      toast({
        title: "Account Data Deleted",
        description: "Your profile data has been deleted. Please contact support to fully delete your account.",
      });

      // Sign out
      await signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
      setDeleteConfirmation('');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out",
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={onBack} className="p-2">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Account Settings</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Full Name
              </label>
              {isEditing ? (
                <Input
                  value={profile.full_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                  className="w-full"
                />
              ) : (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-foreground">{profile.full_name || 'Not set'}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Email Address
              </label>
              {isEditing ? (
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email address"
                  className="w-full"
                />
              ) : (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-foreground">{profile.email || 'Not set'}</p>
                </div>
              )}
            </div>

          </div>

          {isEditing ? (
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  loadProfile(); // Reset to original values
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              className="w-full"
            >
              Edit Profile
            </Button>
          )}
        </div>

        {/* Security - MFA Management */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security
          </h2>

          <div className="p-4 bg-muted rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Two-Factor Authentication (MFA)</p>
                <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
              </div>
              <div className="flex items-center gap-2">
                {mfaEnabled ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Shield className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-background rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Status: {mfaEnabled ? 'Enabled' : 'Disabled'}
                </p>
                {mfaEnabled && mfaFactors.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {mfaFactors.length} authenticator{mfaFactors.length > 1 ? 's' : ''} enrolled
                  </p>
                )}
              </div>

              {mfaEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mfaFactors[0] && handleDisableMFA(mfaFactors[0].id)}
                  disabled={loading}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Disable MFA
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMFAEnrollment(true)}
                  className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                >
                  Enable MFA
                </Button>
              )}
            </div>

            {mfaEnabled && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-xs text-green-800 dark:text-green-200">
                  ✓ Your account is protected with two-factor authentication
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Roles Management */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Roles & Permissions
          </h2>
          <UserRoleManager onRolesChanged={loadProfile} />
        </div>

        {/* Account Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Account Actions
          </h2>

          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full justify-start"
            >
              <User className="w-4 h-4 mr-3" />
              Sign Out
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-3" />
              Delete Account
            </Button>
          </div>
        </div>

        {/* Account Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Account Information</h2>

          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="text-foreground font-mono text-sm">{user?.id}</p>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Account Created</p>
              <p className="text-foreground">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Last Sign In</p>
              <p className="text-foreground">
                {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Type "DELETE" to confirm
              </label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
                className="w-full"
              />
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                <strong>Warning:</strong> This will permanently delete your account, profile, preferences, and all associated data.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmation('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== 'DELETE' || loading}
            >
              {loading ? 'Deleting...' : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MFA Enrollment Dialog */}
      <MFAEnrollmentDialog
        open={showMFAEnrollment}
        onOpenChange={setShowMFAEnrollment}
        onSuccess={handleMFAEnrollmentSuccess}
      />
    </div>
  );
}; 