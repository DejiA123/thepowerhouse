
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, KeyRound, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

const ForgotPasswordForm = ({ onBackToLogin }: ForgotPasswordFormProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setEmailSent(true);
        toast({
          title: "Password Reset Email Sent",
          description: "Check your email for password reset instructions.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  if (emailSent) {
    return (
      <div className="w-full max-w-md relative z-10">
        <Card className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 dark:border-slate-700/30 transform hover:scale-[1.02] transition-all duration-500 hover:shadow-3xl">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800/50 dark:to-green-700/50 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-400 dark:to-blue-400 bg-clip-text text-transparent mb-2">
              Check Your Email
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-300">
              Password reset instructions sent successfully
            </p>
          </CardHeader>
          <CardContent className="px-8 pb-8 space-y-6">
            <div className="text-center space-y-3">
              <p className="text-gray-600 dark:text-gray-300">
                We've sent password reset instructions to:
              </p>
              <p className="font-semibold text-lg text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-slate-700 rounded-xl py-2 px-4">
                {email}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Follow the link in the email to reset your password.
              </p>
            </div>
            <Button
              onClick={onBackToLogin}
              variant="outline"
              className="w-full h-12 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-400 dark:hover:border-gray-500 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 shadow-md hover:shadow-lg transform hover:-translate-y-1"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md relative z-10">
      <Card className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 dark:border-slate-700/30 transform hover:scale-[1.02] transition-all duration-500 hover:shadow-3xl">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-800/50 dark:to-red-700/50 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <KeyRound className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent mb-2">
            Reset Password
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-300">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="pl-12 h-12 rounded-2xl border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-orange-500 dark:focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-800 transition-all duration-200"
                  required
                />
              </div>
            </div>
            <div className="space-y-4">
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-2xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Send Reset Email
                  </div>
                )}
              </Button>
              <Button
                type="button"
                onClick={onBackToLogin}
                variant="outline"
                className="w-full h-12 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-400 dark:hover:border-gray-500 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 shadow-md hover:shadow-lg transform hover:-translate-y-1"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordForm;
