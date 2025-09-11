import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const EmailConfirmationDebug = () => {
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('testpassword123');
  const [result, setResult] = useState<string>('');

  const testSignup = async () => {
    try {
      setResult('Testing signup...');
      
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          emailRedirectTo: `https://thepowerhouse.lovable.app/email-confirmation`,
          data: {
            full_name: 'Test User',
          },
        },
      });

      if (error) {
        setResult(`Error: ${error.message}`);
      } else if (data.user) {
        setResult(`Success! User created: ${data.user.email}. Check your email for confirmation link.`);
        console.log('Signup data:', data);
      }
    } catch (err) {
      setResult(`Exception: ${err}`);
    }
  };

  const checkAuthSettings = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      setResult(`Current session: ${data.session ? 'Active' : 'None'}`);
      if (data.session?.user) {
        setResult(prev => prev + ` | User: ${data.session.user.email} | Confirmed: ${data.session.user.email_confirmed_at ? 'Yes' : 'No'}`);
      }
    } catch (err) {
      setResult(`Error checking session: ${err}`);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Email Confirmation Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Test Email:</label>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Test Password:</label>
          <input
            type="password"
            value={testPassword}
            onChange={(e) => setTestPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={testSignup} variant="outline">
            Test Signup
          </Button>
          <Button onClick={checkAuthSettings} variant="outline">
            Check Session
          </Button>
        </div>
        {result && (
          <div className="p-3 bg-gray-100 rounded text-sm">
            {result}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
