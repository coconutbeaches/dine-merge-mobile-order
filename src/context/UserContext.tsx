import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types'; // Assuming path is correct, e.g., from ../types or ../../types
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

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
  // supabaseUser and supabaseSession are useful for debugging or advanced scenarios, but not directly exposed.
  // const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  // const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start true

  useEffect(() => {
    let isMounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const fetchUserProfile = async (userId: string) => {
      if (!isMounted) return;
      // console.log("UserContext: Fetching user profile for ID:", userId);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*, role') // Ensure role is fetched
          .eq('id', userId)
          .maybeSingle();

        if (!isMounted) return;
        if (error) {
          console.error('UserContext: Error fetching user profile:', error);
          setCurrentUser(null);
          return;
        }

        if (data) {
          // console.log("UserContext: User profile found:", data);
          setCurrentUser({
            id: data.id,
            email: data.email,
            name: data.name || data.email?.split('@')[0] || 'User',
            phone: data.phone || "",
            role: data.role || 'customer', // Store the role, default to 'customer'
            addresses: [],
            orderHistory: []
          });
        } else {
          // console.log("UserContext: No user profile found for ID:", userId);
          setCurrentUser(null);
        }
      } catch (error) {
        if (isMounted) {
          console.error('UserContext: Error in fetchUserProfile:', error);
          setCurrentUser(null);
        }
      }
    };

    const initializeAuth = async () => {
      if (!isMounted) return;
      setIsLoading(true); // Set loading true at the start of initialization

      // 1. Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!isMounted) return;
          // console.log("UserContext: Auth state changed:", event, session);

          // Potentially set loading true here if a significant change is happening
          // For example, if SIGNED_IN and we are about to fetch profile
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            if (session && session.user) {
              // setSupabaseSession(session); // Internal state if needed
              // setSupabaseUser(session.user); // Internal state if needed
              setIsLoading(true); // Indicate loading before fetching profile
              await fetchUserProfile(session.user.id);
              setIsLoading(false); // Loading false after profile is fetched/set
            } else {
              // This case might occur if a session was expected but not found
              setCurrentUser(null);
              // setSupabaseUser(null);
              // setSupabaseSession(null);
              setIsLoading(false);
            }
          } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
            // setSupabaseUser(null);
            // setSupabaseSession(null);
            setIsLoading(false); // User is definitively out, loading is false
          }
          // For other events, we might not need to change isLoading,
          // or fetchUserProfile itself handles setCurrentUser.
        }
      );
      authSubscription = subscription;

      // 2. Check for existing session and fetch profile on initial load
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (sessionError) {
          console.error("UserContext: Error getting initial session:", sessionError);
          setCurrentUser(null);
        } else if (session && session.user) {
          // console.log("UserContext: Initial session found.", session);
          // setSupabaseSession(session);
          // setSupabaseUser(session.user);
          // setIsLoading(true) is already set
          await fetchUserProfile(session.user.id);
        } else {
          // console.log("UserContext: No initial session.");
          setCurrentUser(null);
        }
      } catch (e) {
        if (isMounted) {
          console.error("UserContext: Exception during initial session check:", e);
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          // This ensures isLoading is false after the INITIAL attempt to get session/profile
          // Subsequent changes via onAuthStateChange will manage their own isLoading toggles if necessary
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
  }, []); // Single useEffect for initialization

  const updateUser = (updatedUser: User) => {
    // ... (updateUser implementation remains the same)
    setCurrentUser(updatedUser);
    if (updatedUser.id) {
      supabase
        .from('profiles')
        .update({ name: updatedUser.name, phone: updatedUser.phone })
        .eq('id', updatedUser.id)
        .then(({ error }) => { if (error) console.error('Error updating user profile:', error); });
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    // ... (login implementation remains the same)
    // It implicitly triggers onAuthStateChange which handles profile fetch and loading state.
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { console.error('Error signing in:', error); return false; }
      return true;
    } catch (error) { console.error('Unexpected error during login:', error); return false; }
  };
  
  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    // ... (signup implementation remains the same)
    // It implicitly triggers onAuthStateChange.
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: window.location.origin } });
      if (error) { console.error('Error signing up:', error); return false; }
      return true;
    } catch (error) { console.error('Unexpected error during signup:', error); return false; }
  };
  
  const logout = async () => {
    // ... (logout implementation remains the same)
    // It implicitly triggers onAuthStateChange.
    try {
      await supabase.auth.signOut();
      // setCurrentUser(null) will be handled by onAuthStateChange
    } catch (error) { console.error('Error signing out:', error); }
  };

  const value = {
    currentUser,
    isLoggedIn: !!currentUser, // Simpler: if currentUser is not null, user is logged in.
                             // Supabase session presence is an internal detail for this context.
    isLoading,
    login,
    signup,
    logout,
    updateUser
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
