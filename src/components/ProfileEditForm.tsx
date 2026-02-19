import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Save, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
      case 'name': return 'Full Name';
      case 'about': return 'Bio / About';
      case 'phone': return 'Phone Number';
      case 'links': return 'Social Links';
      default: return 'Edit Profile';
    }
  };

  const getFieldPlaceholder = () => {
    switch (field) {
      case 'name': return 'Enter your full name...';
      case 'about': return 'Tell the community about yourself...';
      case 'phone': return 'e.g. +1 234 567 890';
      case 'links': return 'Website, Instagram, Twitter...';
      default: return 'Type here...';
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

    const validationError = validateField(field, value);
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    if (value.trim() === currentValue.trim()) {
      onBack();
      return;
    }

    setLoading(true);
    try {
      await onSave(value);
      onBack();
    } catch (error) {
      console.error('Error in ProfileEditForm handleSave:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Decorative Blur */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Premium Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-900 px-6 py-4 flex items-center justify-between mt-12">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </Button>
        <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Edit {getFieldTitle()}</h1>
        <div className="w-10"></div>
      </div>

      <div className="max-w-xl mx-auto p-8 space-y-10 relative z-10">
        <div className="space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 ml-4">
              Update {getFieldTitle()}
            </label>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[30px] blur opacity-10 group-focus-within:opacity-25 transition duration-500"></div>
              <div className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] overflow-hidden">
                {field === 'about' || field === 'links' ? (
                  <Textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={getFieldPlaceholder()}
                    rows={field === 'about' ? 6 : 4}
                    className="w-full bg-transparent border-none focus-visible:ring-0 p-6 text-lg font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 resize-none shadow-none"
                    maxLength={field === 'about' ? 500 : 200}
                  />
                ) : (
                  <Input
                    type={field === 'phone' ? 'tel' : 'text'}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={getFieldPlaceholder()}
                    className="w-full bg-transparent border-none focus-visible:ring-0 h-16 px-6 text-lg font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 shadow-none"
                    maxLength={field === 'name' ? 50 : undefined}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-4">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Character Limit: {field === 'about' ? 500 : field === 'name' ? 50 : field === 'links' ? 200 : 'Unlimited'}
              </span>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                value.length > (field === 'about' ? 450 : 40) ? "text-rose-500" : "text-indigo-500"
              )}>
                {value.length} Used
              </span>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={loading || !value.trim() || value.trim() === currentValue.trim()}
            className="w-full h-16 rounded-[28px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.02] active:scale-95 transition-all text-sm font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 dark:shadow-white/5"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
