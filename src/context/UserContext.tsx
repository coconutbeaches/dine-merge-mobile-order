import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { User, GuestUser } from '../types';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { fetchUserProfile, updateUserProfile } from '@/services/userProfileService';
import { supabase } from '@/integrations/supabase/client';

interface UserContextType {
  currentUser: User | GuestUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
  loginOrSignup: (email: string, password: string, name?: string) => Promise<{ success: boolean; error: string | null; a_new_user_was_created: boolean; }>;
  triggerGuestUserReload: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUserContext must be used within a UserProvider');
  return context;
};

interface UserProviderProps { children: ReactNode }

export const UserProvider = ({ children }: UserProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | GuestUser | null>(null);
  const [guestUserLoading, setGuestUserLoading] = useState(true); // New state for guest loading
  const [guestUserReloadTrigger, setGuestUserReloadTrigger] = useState(0); // New state for triggering reload

  const fetchProfileAndSet = useCallback(async (userId: string) => {
    console.log("[UserContext] fetchProfileAndSet called. userId:", userId);
    if (!userId) {
      setCurrentUser(null);
      return;
    }

    // 1) fetch "profiles" row for this auth user
    const profile = await fetchUserProfile(userId);
    console.log("[UserContext] Regular profile fetched:", profile);

    let mergedProfileOrProfile: User | GuestUser | null = profile;

    // 2) if it’s an anonymous_* email, grab the matching guest_users row
    if (profile && profile.email && profile.email.startsWith('anonymous_')) {
      const { data: guestUser, error } = await supabase
        .from('guest_users')
        .select('first_name, stay_id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (guestUser) {
        mergedProfileOrProfile = {
          ...profile,
          name: guestUser.first_name, // Override name with guest's first_name
          // Add other guest-specific fields here if needed
        } as User; // Cast back to User as it's a combined profile
        console.log("[UserContext] Merged profile with guest data:", mergedProfileOrProfile);
      } else if (error) {
        console.error('[UserContext] Error fetching guest user for anonymous profile:', error);
      }
    }

    setCurrentUser(mergedProfileOrProfile);
  }, []);

  const { supabaseUser, supabaseSession, isLoading: supabaseAuthLoading } = useSupabaseAuth(fetchProfileAndSet);

  // Effect to handle guest user login from localStorage
  useEffect(() => {
    console.log("[UserContext] useEffect for guest user reload. trigger:", guestUserReloadTrigger);
    const loadGuestUser = async () => {
      setGuestUserLoading(true);

      // If we already have a "real" Supabase session, don’t try to load a guest.
      if (supabaseSession) {
        setGuestUserLoading(false);
        return;
      }

      const storedUserId = localStorage.getItem('user_id');
      console.log("[UserContext] loadGuestUser running. storedUserId:", storedUserId);

      if (storedUserId) {
        // Restore session (for RLS) then fetch guest row
        const { data: { session }, error: getSessionError } = await supabase.auth.getSession();
        if (getSessionError || !session?.access_token) {
          console.warn("[UserContext] Failed to get session for guest user:", getSessionError);
          localStorage.removeItem('user_id'); // Clear invalid guest user_id
          setCurrentUser(null);
          setGuestUserLoading(false);
          return;
        }

        // Ensure the session is set on the client for RLS
        await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });

        const { data, error } = await supabase
          .from('guest_users')
          .select('id, user_id, first_name, stay_id, created_at')
          .eq('auth_user_id', storedUserId)
          .maybeSingle();

        if (data) {
          setCurrentUser({
            id: storedUserId,
            email: `anonymous_${storedUserId}@example.com`,
            name: data.first_name,
            phone: '',
            role: 'customer',
            addresses: [],
            orderHistory: [],
          });
          console.log("[UserContext] Guest user set (combined profile):", data);
        } else if (error) {
          console.error('[UserContext] Error fetching guest user:', error);
          localStorage.removeItem('user_id');
        }
      }
      setGuestUserLoading(false);
      console.log("[UserContext] guestUserLoading set to false.", !!currentUser);
    };
    loadGuestUser();
  }, [guestUserReloadTrigger, supabaseSession]); // Add supabaseSession to dependencies

  const isLoading = supabaseAuthLoading || guestUserLoading;

  console.log("[UserContext] Render. currentUser:", currentUser, "isLoggedIn:", !!currentUser || !!supabaseSession, "isLoading:", isLoading);

  const updateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    updateUserProfile(updatedUser);
  };

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.log('[UserContext] login error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[UserContext] login try/catch error:', err);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('user_id'); // Clear guest user_id
      setCurrentUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const loginOrSignup = async (email: string, password: string, name?: string): Promise<{ success: boolean; error: string | null; a_new_user_was_created: boolean; }> => {
    // Try to sign up first
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // The handle_new_user trigger in the DB will use the email as name if not provided.
        data: { name: name && name.trim().length > 0 ? name.trim() : undefined },
        emailRedirectTo: window.location.origin,
      },
    });

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes('user already registered')) {
        // User exists, so let's try to sign them in.
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          return { success: false, error: signInError.message, a_new_user_was_created: false };
        }
        // Sign in was successful.
        return { success: true, error: null, a_new_user_was_created: false };
      }
      // Another sign up error occurred.
      return { success: false, error: signUpError.message, a_new_user_was_created: false };
    }
    
    // Sign up was successful, a new user was created.
    return { success: true, error: null, a_new_user_was_created: true };
  };

  const triggerGuestUserReload = useCallback(() => {
    setGuestUserReloadTrigger(prev => prev + 1);
  }, []);

  const value = {
    currentUser,
    isLoggedIn: !!currentUser || !!supabaseSession,
    isLoading,
    login,
    logout,
    updateUser,
    loginOrSignup,
    triggerGuestUserReload,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
