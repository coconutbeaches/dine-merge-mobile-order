import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client'; // Import if direct Supabase interaction is needed

const ForgotPassword = () => {
  const router = useRouter();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false); // To show a confirmation message

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`, // Or your desired reset password page
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Check Your Email",
        description: "If an account exists for this email, a password reset link has been sent."
      });
      setEmailSent(true);
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout title="Forgot Password" showBackButton>
      <div className="page-container flex justify-center items-center">
        <Card className="w-full max-w-md">
          {emailSent ? (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-restaurant-primary text-2xl">Password Reset Email Sent</CardTitle>
                <CardDescription>
                  Please check your inbox (and spam folder) for a link to reset your password.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button 
                  onClick={() => router.push('/login')} 
                  className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90"
                >
                  Back to Login
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-restaurant-primary text-2xl">Reset Your Password</CardTitle>
                <CardDescription>
                  Enter your email address and we'll send you a link to reset your password.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordReset}>
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
                        disabled={isLoading}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90"
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending..." : "Send Reset Link"}
                    </Button>
                    
                    <div className="text-center mt-4">
                      <p className="text-sm text-muted-foreground">
                        Remembered your password?{" "}
                        <Link href="/login" className="text-restaurant-primary hover:underline">
                          Login
                        </Link>
                      </p>
                    </div>
                  </div>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default ForgotPassword;
