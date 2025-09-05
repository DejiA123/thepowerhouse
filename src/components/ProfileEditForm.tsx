import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProfileEditFormProps {
  field: 'name' | 'about' | 'phone' | 'links';
  currentValue: string;
  onBack: () => void;
  onSave: (value: string) => void;
}

export const ProfileEditForm = ({ field, currentValue, onBack, onSave }: ProfileEditFormProps) => {
  const [value, setValue] = useState(currentValue);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const getFieldTitle = () => {
    switch (field) {
      case 'name': return 'Name';
      case 'about': return 'About';
      case 'phone': return 'Phone Number';
      case 'links': return 'Links';
      default: return 'Edit';
    }
  };

  const getFieldPlaceholder = () => {
    switch (field) {
      case 'name': return 'Enter your name';
      case 'about': return 'Tell us about yourself...';
      case 'phone': return 'Enter your phone number';
      case 'links': return 'Add your social media or website links';
      default: return 'Enter value';
    }
  };

  const validateField = (field: string, value: string): string | null => {
    if (!value.trim()) {
      return `${field} cannot be empty`;
    }

    switch (field) {
      case 'name':
        if (value.trim().length < 2) {
          return 'Name must be at least 2 characters long';
        }
        if (value.trim().length > 50) {
          return 'Name must be less than 50 characters';
        }
        break;
      case 'phone':
        // Basic phone validation - allow various formats
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
          return 'Please enter a valid phone number';
        }
        break;
      case 'about':
        if (value.trim().length > 500) {
          return 'Bio must be less than 500 characters';
        }
        break;
      case 'links':
        if (value.trim().length > 200) {
          return 'Links must be less than 200 characters';
        }
        break;
    }
    return null;
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update your profile",
        variant: "destructive"
      });
      return;
    }

    // Validate the input
    const validationError = validateField(field, value);
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    // Check if value actually changed
    if (value.trim() === currentValue.trim()) {
      toast({
        title: "No Changes",
        description: "No changes were made to save",
      });
      onBack();
      return;
    }
    
    setLoading(true);
    
    try {
      // Call the parent's save function
      await onSave(value);
      
      // If we get here, the save was successful
      // The parent component will handle the database update and show success toast
      
    } catch (error) {
      console.error('Error in ProfileEditForm handleSave:', error);
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <button onClick={onBack} className="p-2">
          <ChevronLeft className="w-6 h-6 text-gray-900" />
        </button>
        <h1 className="profile-title">{getFieldTitle()}</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-4 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {getFieldTitle()}
            </label>
            {field === 'about' || field === 'links' ? (
              <Textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={getFieldPlaceholder()}
                rows={field === 'about' ? 4 : 3}
                className="w-full"
                maxLength={field === 'about' ? 500 : 200}
              />
            ) : (
              <Input
                type={field === 'phone' ? 'tel' : 'text'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={getFieldPlaceholder()}
                className="w-full"
                maxLength={field === 'name' ? 50 : undefined}
              />
            )}
            <div className="text-xs text-gray-500 text-right">
              {value.length} / {field === 'about' ? 500 : field === 'name' ? 50 : field === 'links' ? 200 : '∞'}
            </div>
          </div>

          <Button 
            onClick={handleSave}
            disabled={loading || !value.trim() || value.trim() === currentValue.trim()}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};