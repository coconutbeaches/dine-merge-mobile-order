import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { User } from '../types';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { fetchUserProfile, updateUserProfile } from '@/services/userProfileService';
import { supabase } from '@/integrations/supabase/client';

interface UserContextType {
  currentUser: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
  loginOrSignup: (email: string, password: string, name?: string) => Promise<{ success: boolean; error: string | null; a_new_user_was_created: boolean; }>;
  loginAsGuest: () => Promise<{ success: boolean; error: string | null; }>;
  convertGuestToUser: (email: string, password: string, name?: string) => Promise<{ success: boolean; error: string | null; }>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUserContext must be used within a UserProvider');
  return context;
};

interface UserProviderProps { children: ReactNode }

export const UserProvider = ({ children }: UserProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const fetchProfileAndSet = useCallback(async (userId: string) => {
    const timestamp = Date.now();
    console.log(`[UserContext] ${timestamp} - fetchProfileAndSet called with userId: ${userId}`);
    
    if (!userId) { 
      console.log(`[UserContext] ${Date.now()} - No userId provided, setting currentUser to null`);
      setCurrentUser(null); 
      return; 
    }
    
    console.log(`[UserContext] ${Date.now()} - About to fetch profile for userId: ${userId}`);
    const profile = await fetchUserProfile(userId);
    console.log(`[UserContext] ${Date.now()} - Profile fetched, setting currentUser:`, profile);
    setCurrentUser(profile);
    console.log(`[UserContext] ${Date.now()} - fetchProfileAndSet completed (total time: ${Date.now() - timestamp}ms)`);
  }, []);

  const { supabaseUser, supabaseSession, isLoading } = useSupabaseAuth(fetchProfileAndSet);

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
      setCurrentUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const loginOrSignup = async (email: string, password: string, name?: string): Promise<{ success: boolean; error: string | null; a_new_user_was_created: boolean; }> => {
    // OPTIMIZATION: Try signin first (most common case for returning users)
    // This avoids the unnecessary signup attempt for existing users
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!signInError) {
      // Sign in was successful - user already exists
      return { success: true, error: null, a_new_user_was_created: false };
    }
    
    // Sign in failed - check if it's because user doesn't exist
    if (signInError.message.toLowerCase().includes('invalid login credentials') || 
        signInError.message.toLowerCase().includes('email not confirmed') ||
        signInError.message.toLowerCase().includes('invalid user')){
      
      // User doesn't exist, try to create a new account
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
        // Signup also failed
        return { success: false, error: signUpError.message, a_new_user_was_created: false };
      }
      
      // Sign up was successful, a new user was created.
      return { success: true, error: null, a_new_user_was_created: true };
    }
    
    // Sign in failed for other reasons (wrong password, etc.)
    return { success: false, error: signInError.message, a_new_user_was_created: false };
  };

  const loginAsGuest = async (): Promise<{ success: boolean; error: string | null; }> => {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  };

  const convertGuestToUser = async (email: string, password: string, name?: string): Promise<{ success: boolean; error: string | null; }> => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        email: email,
        password: password,
        data: { name: name && name.trim().length > 0 ? name.trim() : undefined },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // If the user was successfully updated, their profile in the 'profiles' table
      // should also be updated by the 'handle_new_user' trigger or a similar mechanism.
      // We can re-fetch the profile to ensure the context is up-to-date.
      if (data.user?.id) {
        await fetchProfileAndSet(data.user.id);
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('[UserContext] convertGuestToUser try/catch error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'An unknown error occurred during guest conversion.' };
    }
  };

  const value = {
    currentUser,
    isLoggedIn: !!currentUser && !!supabaseSession,
    isLoading,
    login,
    logout,
    updateUser,
    loginOrSignup,
    loginAsGuest,
    convertGuestToUser
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
