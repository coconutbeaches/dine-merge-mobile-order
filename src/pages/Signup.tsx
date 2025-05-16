
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAppContext();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adminAccountCreated, setAdminAccountCreated] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  
  // Create super admin account on component mount
  useEffect(() => {
    const createSuperAdmin = async () => {
      // Check if the account already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'hello@coconutbeachkohphangan.com')
        .single();
      
      if (!existingUser && !adminAccountCreated) {
        // Create the super admin user
        const { error } = await supabase.auth.signUp({
          email: 'hello@coconutbeachkohphangan.com',
          password: 'i<3BigCoconuts!',
          options: {
            data: {
              name: 'Super Admin',
              role: 'admin'
            },
            emailRedirectTo: window.location.origin
          }
        });
        
        if (error) {
          console.error('Error creating admin account:', error);
        } else {
          console.log('Super admin account created successfully');
          setAdminAccountCreated(true);
          toast({
            title: "Admin Account Created",
            description: "Super admin account has been set up successfully."
          });
        }
      }
    };
    
    createSuperAdmin();
  }, [toast]);
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill out all fields",
        variant: "destructive"
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const success = await signup(email, password, name);
      
      if (success) {
        toast({
          title: "Success",
          description: "Your account has been created successfully. Please check your email to verify your account."
        });
        setSignupSuccess(true);
      } else {
        toast({
          title: "Error",
          description: "This email is already in use",
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
  
  return (
    <Layout title="Create Account" showBackButton>
      <div className="page-container">
        {signupSuccess ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-restaurant-primary text-2xl">Check Your Email</CardTitle>
              <CardDescription>
                We've sent a verification link to your email address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <InfoIcon className="h-4 w-4 mr-2" />
                <AlertDescription>
                  Please check your email inbox and click the verification link to complete your registration.
                  You'll be redirected to the site afterward.
                </AlertDescription>
              </Alert>
              <div className="text-center mt-4">
                <Button 
                  onClick={() => navigate('/login')} 
                  variant="outline"
                  className="border-restaurant-primary text-restaurant-primary hover:bg-restaurant-primary/10"
                >
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-restaurant-primary text-2xl">Join Us</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name"
                      placeholder="John Doe"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>
                  
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input 
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Sign Up"}
                  </Button>
                  
                  <div className="text-center mt-4">
                    <p className="text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Link to="/login" className="text-restaurant-primary hover:underline">
                        Login
                      </Link>
                    </p>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Signup;
