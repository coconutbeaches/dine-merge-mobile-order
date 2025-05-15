
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface UserContextType {
  currentUser: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updatedUser: User) => void; // Add the updateUser method
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize authentication state from Supabase
  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setSupabaseSession(session);
          setSupabaseUser(session.user);
          
          // Fetch additional user data from profiles table
          setTimeout(async () => {
            if (session.user?.id) {
              fetchUserProfile(session.user.id);
            }
          }, 0);
        } else {
          setSupabaseSession(null);
          setSupabaseUser(null);
          setCurrentUser(null);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSupabaseSession(session);
        setSupabaseUser(session.user);
        
        if (session.user?.id) {
          fetchUserProfile(session.user.id);
        }
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch user profile from Supabase
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }
      
      if (data) {
        setCurrentUser({
          id: data.id,
          email: data.email,
          name: data.name || data.email.split('@')[0],
          phone: data.phone || "",
          addresses: [], 
          orderHistory: [] 
        });
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  // Add the updateUser method implementation
  const updateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    
    // Optionally, you could update the user profile in Supabase here
    // This would persist the changes to the database
    if (updatedUser.id) {
      supabase
        .from('profiles')
        .update({
          name: updatedUser.name,
          phone: updatedUser.phone
        })
        .eq('id', updatedUser.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating user profile:', error);
          }
        });
    }
  };

  // User Management Functions
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Error signing in:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error during login:', error);
      return false;
    }
  };
  
  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          }
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
      setSupabaseUser(null);
      setSupabaseSession(null);
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
    updateUser // Add the new method to the context value
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
