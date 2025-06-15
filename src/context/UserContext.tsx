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
    if (!userId) { setCurrentUser(null); return; }
    const profile = await fetchUserProfile(userId);
    setCurrentUser(profile);
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

  const value = {
    currentUser,
    isLoggedIn: !!currentUser && !!supabaseSession,
    isLoading,
    login,
    logout,
    updateUser,
    loginOrSignup
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
