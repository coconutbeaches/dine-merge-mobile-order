
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

interface LocationState {
  returnTo?: string;
}

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginOrSignup } = useAppContext();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  
  const locationState = location.state as LocationState | null;
  const returnTo = locationState?.returnTo || '/';
  
  const handleLoginOrSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginOrSignup(email, password);

      if (result.success) {
        if (result.a_new_user_was_created) {
          setSignupSuccess(true);
        } else {
          navigate(returnTo);
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "An unknown error occurred. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[Login.tsx] Login/Signup error:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + (returnTo !== '/' ? returnTo : '/menu'), // Redirect after login
      },
    });
    if (error) {
      toast({
        title: "Google Sign-In Error",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
    // Supabase handles redirection, setIsLoading(false) might not be reached if redirect occurs.
  };
  
  if (signupSuccess) {
    return (
      <Layout title="Verify Your Email" showBackButton>
        <div className="page-container">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-restaurant-primary text-2xl">Check Your Email</CardTitle>
              <CardDescription>
                We've sent a verification link to your email address.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <InfoIcon className="h-4 w-4 mr-2" />
                <AlertDescription>
                  Please click the verification link in your inbox to complete registration.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={() => {
                  setSignupSuccess(false);
                  setEmail('');
                  setPassword('');
                }} 
                variant="outline"
                className="w-full"
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Login or Sign Up" showBackButton>
      <div className="page-container">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-restaurant-primary text-2xl">Login or Sign Up</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLoginOrSignup}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="text-right">
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-restaurant-primary hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Continue with Email"}
                </Button>

                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  {/* You can add a Google Icon here if you have one */}
                  Sign in with Google
                </Button>
                
                {/* Removed signup link */}
              </div>
            </form>
            
            {/* Demo credentials removed */}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Login;
