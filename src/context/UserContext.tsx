
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
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
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

  const signup = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: window.location.origin
        }
      });
      if (error) {
        console.error('Error signing up:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Unexpected error during signup:', error);
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

  const value = {
    currentUser,
    isLoggedIn: !!currentUser && !!supabaseSession,
    isLoading,
    login,
    signup,
    logout,
    updateUser
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
