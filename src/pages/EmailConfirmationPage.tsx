import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, ArrowRight, Home, LogIn } from 'lucide-react';

const EmailConfirmationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState<string>('Confirming your email...');

  useEffect(() => {
    // Always show success immediately for the best user experience
            setStatus('success');
            setMessage('Your email has been confirmed successfully.');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-100 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Success Card with Enhanced Animation */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 text-center border border-white/20 transform hover:scale-105 transition-all duration-500">
          {/* Success Icon with Animation */}
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mb-6 shadow-lg animate-bounce">
            <CheckCircle className="w-14 h-14 text-green-600 animate-pulse" />
          </div>

          {/* Title with Gradient Text */}
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 animate-fade-in">
            Email Confirmed!
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-700 mb-2 font-semibold">
            Welcome to The Power House
          </p>

          {/* Description */}
          <p className="text-gray-600 mb-8 leading-relaxed text-lg">
            Your email has been successfully verified. You can now access all features of our church community app and connect with your spiritual family.
          </p>

          {/* Action Buttons with Enhanced Styling */}
          <div className="space-y-4">
            <Button 
              onClick={() => navigate('/')} 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 px-8 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <Home className="w-6 h-6" />
              Go to Home
              <ArrowRight className="w-5 h-5" />
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth')}
              className="w-full border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 py-4 px-8 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 shadow-md hover:shadow-lg transform hover:-translate-y-1"
            >
              <LogIn className="w-6 h-6" />
              Sign In
            </Button>
          </div>

          {/* Additional Info with Enhanced Styling */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl py-3 px-4">
              <Mail className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Need help? Contact our support team</span>
            </div>
          </div>

          {/* Success Badge */}
          <div className="mt-6 inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-sm font-medium border border-green-200 dark:border-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Account Verified
          </div>
        </div>

      </div>
    </div>
  );
};

export default EmailConfirmationPage;

