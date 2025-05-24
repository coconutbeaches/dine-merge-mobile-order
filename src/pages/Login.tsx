
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client'; // Added for Google Sign-In

interface LocationState {
  returnTo?: string;
}

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAppContext();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const locationState = location.state as LocationState | null;
  const returnTo = locationState?.returnTo || '/';
  
  const handleLogin = async (e: React.FormEvent) => {
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
      const success = await login(email, password);
      
      if (success) {
        // Toast for successful login removed as requested
        // toast({
        //   title: "Success",
        //   description: "You've been logged in successfully"
        // });
        navigate(returnTo);
      } else {
        toast({
          title: "Error",
          description: "Invalid email or password. Please check your credentials and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
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
  
  return (
    <Layout title="Login" showBackButton>
      <div className="page-container">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-restaurant-primary text-2xl">Welcome Back</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
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
                  {isLoading ? "Logging in..." : "Login"}
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
                
                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link to="/signup" className="text-restaurant-primary hover:underline">
                      Sign Up
                    </Link>
                  </p>
                </div>
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

