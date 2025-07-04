import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client'; // To be used in the next step

const ResetPassword = () => {
  const navigate = useNavigate();
  // const location = useLocation(); // No longer needed for access token
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // useEffect and accessToken state removed as Supabase handles session via recovery link

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill out both password fields.",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: password });

      if (error) {
        // This error can occur if the recovery token is invalid, expired, or already used.
        // Or if the password does not meet Supabase's strength requirements.
        throw error;
      }

      toast({
        title: "Success",
        description: "Your password has been updated successfully. You can now log in with your new password."
      });
      setUpdateSuccess(true); // Show success message
      // Consider auto-redirect or let user click button
      // setTimeout(() => navigate('/login'), 3000); 
    } catch (error: any) {
      console.error("Password update error:", error);
      toast({
        title: "Error Updating Password",
        description: error.message || "Failed to update password. The reset link may be invalid or expired. Please try resetting your password again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout title="Set New Password" showBackButton>
      <div className="page-container flex justify-center items-center">
        <Card className="w-full max-w-md">
          {updateSuccess ? (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-restaurant-primary text-2xl">Password Updated</CardTitle>
                <CardDescription>
                  Your new password has been set. You can now log in.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button 
                  onClick={() => navigate('/login')} 
                  className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90"
                >
                  Back to Login
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-restaurant-primary text-2xl">Set Your New Password</CardTitle>
                <CardDescription>
                  Enter and confirm your new password below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">New Password</Label>
                      <Input 
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input 
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90"
                      disabled={isLoading}
                    >
                      {isLoading ? "Updating..." : "Update Password"}
                    </Button>
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

export default ResetPassword;
