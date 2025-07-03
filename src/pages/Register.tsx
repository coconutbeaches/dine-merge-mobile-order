import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserContext } from '@/context/UserContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  first_name: z.string().min(1, { message: "First name is required." }),
});

type FormData = z.infer<typeof formSchema>;

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateUser } = useUserContext();
  const stayIdQueryParam = searchParams.get('stay_id');
  const [stayId, setStayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[Register] mounted. stayIdQueryParam:", stayIdQueryParam);
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
    },
  });

  useEffect(() => {
    console.log("[Register] useEffect triggered. stayIdQueryParam:", stayIdQueryParam);
    if (stayIdQueryParam) {
      const resolvedStayId = Array.isArray(stayIdQueryParam) ? stayIdQueryParam[0] : stayIdQueryParam;
      setStayId(resolvedStayId);
      setLoading(false);
      console.log("[Register] stayId set to:", resolvedStayId);

      // If already registered, redirect
      const storedAuthUserId = localStorage.getItem('user_id');
      if (storedAuthUserId) {
        toast.info("You are already registered for this stay. Redirecting to menu...");
        navigate('/menu');
      }

    } else {
      // Handle case where stay_id is not in URL
      toast.error("Stay ID not found in URL. Please use the link provided by your hotel.");
      setLoading(false);
      console.log("[Register] stayId not found in URL.");
    }
  }, [stayIdQueryParam, navigate]);

  const onSubmit = async (data: FormData) => {
    if (!stayId) {
      toast.error("Stay ID is missing. Cannot register.");
      return;
    }

    setLoading(true);
    const generatedUserId = `${stayId.toLowerCase()}_${data.first_name.toLowerCase()}`;

    try {
      // 1. Sign in anonymously to get an auth.users ID
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

      if (authError) {
        throw authError;
      }

      const authUserId = authData.user?.id;
      if (!authUserId) {
        throw new Error("Could not get auth user ID after anonymous sign-in.");
      }

      // Explicitly set session to ensure auth.uid() is available for RLS
      const { data: { session: newSession }, error: setSessionError } = await supabase.auth.setSession({ access_token: authData.session.access_token, refresh_token: authData.session.refresh_token });
      if (setSessionError || !newSession) {
        console.error("Error setting session after anonymous sign-in:", setSessionError);
        throw new Error("Failed to set user session.");
      }
      console.log("[Register] Session set. auth.uid() is now:", newSession.user.id);

      console.log("[Register] BEFORE GUEST INSERT: Data to insert:", {
        user_id: generatedUserId, // This is the custom ID, not the auth.uid()
        first_name: data.first_name,
        stay_id: stayId,
        auth_user_id: authUserId, // Link to the auth.users ID
      });

      // 2. Try to insert into guest_users table, linking to auth.users.id
      // This will fail with 23505 if the authUserId is already linked to a guest_user
      const { data: guestInsertData, error: guestInsertError } = await supabase
        .from('guest_users')
        .insert({
          user_id: generatedUserId, // This is the custom ID, not the auth.uid()
          first_name: data.first_name,
          stay_id: stayId,
          auth_user_id: authUserId, // Link to the auth.users ID
        })
        .select(); // Add .select() to get the inserted data

      if (guestInsertError) {
        console.error("[Register] guest_users insert error:", guestInsertError);
        if (guestInsertError.code === '23505') {
          toast.info("You are already registered for this stay. Redirecting to menu...");
        } else {
          throw guestInsertError;
        }
      } else {
        console.log("[Register] guest_users insert successful:", guestInsertData);
        toast.success("Registration successful!");
        // Use the inserted guest row directly to update context (avoids race on SELECT)
        if (guestInsertData && guestInsertData[0]) {
          const guest = guestInsertData[0];
          updateUser({
            id: authUserId,
            email: `anonymous_${authUserId}@example.com`,
            name: guest.first_name,
            phone: '',
            role: 'customer',
            addresses: [],
            orderHistory: [],
          });
        }
      }

      // 3. Store the auth_user_id in localStorage
      localStorage.setItem('user_id', authUserId); // Store auth.uid() for guest session
      console.log("[Register] auth_user_id set in localStorage:", authUserId);
      // triggerGuestUserReload(); // no longer needed, context already updated above
      navigate('/menu');

    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(`Registration failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const roomNumber = stayId ? stayId.split('-')[0] : 'your room';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          Welcome to {roomNumber}!
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Please enter your first name to get started.
        </p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="first_name" className="sr-only">First Name</Label>
            <Input
              id="first_name"
              type="text"
              placeholder="Your First Name"
              {...form.register('first_name')}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {form.formState.errors.first_name && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.first_name.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Register
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Register;
