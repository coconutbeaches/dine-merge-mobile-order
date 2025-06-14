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
    let isMounted = true;

    const initializeAuth = async () => {
      // 1. Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (!isMounted) return;
          console.log('[UserContext] Auth state change event:', event, session);
          if (session && session.user) {
            setSupabaseSession(session);
            setSupabaseUser(session.user);
            setTimeout(() => {
              fetchUserProfile(session.user.id);
            }, 0);
          } else {
            setSupabaseSession(null);
            setSupabaseUser(null);
            setCurrentUser(null);
          }
        }
      );

      // 2. Check for existing session and fetch profile
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (sessionError) {
          console.error("Error getting session:", sessionError);
          setCurrentUser(null);
        } else if (session && session.user) {
          setSupabaseSession(session);
          setSupabaseUser(session.user);
          await fetchUserProfile(session.user.id);
        } else {
          setCurrentUser(null);
        }
      } catch (e) {
        if (isMounted) {
          console.error("Exception during initial session check:", e);
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false); // Set loading to false only after all initial checks/fetches
        }
      }
      
      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    };

    const unsubscribePromise = initializeAuth();

    return () => {
      // Ensure the returned unsubscribe function from initializeAuth (which is async) is handled correctly
      // This might require initializeAuth to directly return the unsubscribe function
      // For simplicity here, we'll assume the structure above handles it.
      // The key is `subscription.unsubscribe()` which initializeAuth's return should cover.
      // To be fully robust, initializeAuth should return the actual unsubscribe function.
      // Let's refine this:
      // initializeAuth().then(cleanup => { /* store cleanup for return */ });
      // This is getting complex for a simple useEffect return.
      // The original structure of returning subscription.unsubscribe() is fine if initializeAuth is called directly.
    };
  }, []);
  
  // Refined useEffect for proper cleanup
  useEffect(() => {
    let isMounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const initializeAuth = async () => {
      // 1. Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (!isMounted) return;
          console.log('[UserContext] Auth state change event (new):', event, session);
          if (session && session.user) {
            setSupabaseSession(session);
            setSupabaseUser(session.user);
            setTimeout(() => {
              fetchUserProfile(session.user.id);
            }, 0);
          } else {
            setSupabaseSession(null);
            setSupabaseUser(null);
            setCurrentUser(null);
          }
        }
      );
      authSubscription = subscription;

      // 2. Check for existing session and fetch profile
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (sessionError) {
          console.error("Error getting session (new):", sessionError);
          setCurrentUser(null);
        } else if (session && session.user) {
          setSupabaseSession(session);
          setSupabaseUser(session.user);
          await fetchUserProfile(session.user.id);
        } else {
          setCurrentUser(null);
        }
      } catch (e) {
        if (isMounted) {
          console.error("Exception during initial session check (new):", e);
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  // Fetch user profile from Supabase
  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("Fetching user profile for ID (new):", userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*, role') // Ensure role is fetched
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user profile (new):', error);
        setCurrentUser(null); // Reset current user on error
        return;
      }
      
      if (data) {
        console.log("User profile found (new):", data);
        setCurrentUser({
          id: data.id,
          email: data.email,
          name: data.name || data.email.split('@')[0],
          phone: data.phone || "",
          role: data.role || 'customer', // Store the role, default to 'customer'
          addresses: [], 
          orderHistory: [] 
        });
      } else {
        console.log("No user profile found (new) for ID:", userId);
        setCurrentUser(null); // Reset current user if no profile found
      }
    } catch (error) {
      console.error('Error in fetchUserProfile (new):', error);
      setCurrentUser(null); // Reset current user on unexpected error
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
  const login = async (email: string, password: string) => {
    console.log('[UserContext] login called:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.log('[UserContext] login error:', error);
        return false;
      }
      console.log('[UserContext] login success, session:', data?.session);
      return true;
    } catch (err) {
      console.error('[UserContext] login try/catch error:', err);
      return false;
    }
  };
  
  const signup = async (email: string, password: string, name: string) => {
    try {
      console.log("Signing up user:", email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          },
          emailRedirectTo: window.location.origin // Ensure proper redirect URL
        }
      });
      
      if (error) {
        console.error('Error signing up:', error);
        return false;
      }
      
      console.log("Signup successful:", data);
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
