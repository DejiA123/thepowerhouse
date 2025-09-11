import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

const AuthPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");

  // Redirect if already logged in
  if (user) {
    navigate("/");
    return null;
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 dark:bg-blue-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 dark:bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        </div>
        <ForgotPasswordForm onBackToLogin={() => setShowForgotPassword(false)} />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user) {
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Attempting signup with:', {
        email: signupEmail,
        redirectTo: `https://thepowerhouse.lovable.app/email-confirmation`
      });

      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: {
            full_name: signupFullName,
          },
          emailRedirectTo: `https://thepowerhouse.lovable.app/email-confirmation`
        }
      });

      console.log('Signup response:', { data, error });

      if (error) {
        console.error('Signup error:', error);
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user) {
        console.log('Signup successful:', data.user);
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account. Check your spam folder if you don't see it.",
        });
        
        // Clear the form
        setSignupEmail("");
        setSignupPassword("");
        setSignupFullName("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Modern Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-indigo-300/30 dark:from-blue-500/20 dark:to-indigo-600/20 rounded-full filter blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-200/30 to-pink-300/30 dark:from-purple-500/20 dark:to-pink-600/20 rounded-full filter blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-cyan-100/20 to-blue-200/20 dark:from-cyan-500/10 dark:to-blue-600/10 rounded-full filter blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Main Auth Card with Enhanced Design */}
        <Card className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 dark:border-slate-700/30 transform hover:scale-[1.02] transition-all duration-500 hover:shadow-3xl dark:hover:shadow-2xl">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-blue-600 to-indigo-600 dark:from-slate-100 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-3 tracking-tight">
              The Power House
            </CardTitle>
            <p className="text-slate-600 dark:text-slate-300 text-lg font-medium">
              Sign in to your account or create a new one
            </p>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-700 rounded-2xl p-1.5">
                <TabsTrigger 
                  value="login" 
                  className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-lg data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-300 font-semibold transition-all duration-300 data-[state=active]:scale-105 text-slate-700 dark:text-slate-300"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-lg data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-300 font-semibold transition-all duration-300 data-[state=active]:scale-105 text-slate-700 dark:text-slate-300"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
            
            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-12 h-12 rounded-2xl border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-12 pr-12 h-12 rounded-2xl border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot password?
                  </Button>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Signing in...
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignup} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Your full name"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      className="pl-12 h-12 rounded-2xl border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition-all duration-200"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-12 h-12 rounded-2xl border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition-all duration-200"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Choose a strong password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-12 pr-12 h-12 rounded-2xl border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition-all duration-200"
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating account...
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      </div>
    </div>
  );
};

export default AuthPage;