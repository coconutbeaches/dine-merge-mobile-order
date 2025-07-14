import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { User } from '../types';
import { fetchUserProfile, updateUserProfile } from '@/services/userProfileService';
import { supabase } from '@/integrations/supabase/client';

interface UserContextType {
  currentUser: User | null;
  isLoggedIn: boolean;
  authReady: boolean;
  isLoading: boolean;
  error: string | null;
  retryAuth: () => void;
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  
  const fetchProfileAndSet = useCallback(async (userId: string) => {
    const timestamp = Date.now();
    console.log(`[UserContext] ${timestamp} - fetchProfileAndSet called with userId: ${userId}`);
    
    if (!userId) { 
      console.log(`[UserContext] ${Date.now()} - No userId provided, setting currentUser to null`);
      setCurrentUser(null); 
      return; 
    }
    
    try {
      console.log(`[UserContext] ${Date.now()} - About to fetch profile for userId: ${userId}`);
      const profile = await fetchUserProfile(userId);
      console.log(`[UserContext] ${Date.now()} - Profile fetched, setting currentUser:`, profile);
      setCurrentUser(profile);
      console.log(`[UserContext] ${Date.now()} - fetchProfileAndSet completed (total time: ${Date.now() - timestamp}ms)`);
    } catch (err) {
      console.error('[UserContext] Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    const initStartTime = Date.now();
    console.log(`[UserContext.initializeAuth] ${initStartTime} - Starting initializeAuth`);
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`[UserContext.initializeAuth] ${Date.now()} - About to call supabase.auth.getSession()`);
      
      // Fast, direct call to supabase.auth.getSession()
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) console.error(error);
      
      console.log(`[UserContext.initializeAuth] ${Date.now()} - getSession completed, session:`, session);
      
      setSupabaseSession(session ?? null);
      
      if (session?.user) {
        console.log(`[UserContext.initializeAuth] ${Date.now()} - Session user found, fetching profile`);
        await fetchProfileAndSet(session.user.id);
      } else {
        console.log(`[UserContext.initializeAuth] ${Date.now()} - No session user, setting currentUser to null`);
        setCurrentUser(null);
      }
      
      console.log(`[UserContext.initializeAuth] ${Date.now()} - initializeAuth completed (total time: ${Date.now() - initStartTime}ms)`);
    } catch (error) {
      console.error(`[UserContext.initializeAuth] ${Date.now()} - Session initialization failed:`, error);
      setError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
      console.log(`[UserContext.initializeAuth] ${Date.now()} - setIsLoading(false) called, initializeAuth finished (total time: ${Date.now() - initStartTime}ms)`);
    }
  }, [fetchProfileAndSet]);
  
  const retryAuth = useCallback(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    let isMounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      const authStateChangeTime = Date.now();
      console.log(`[supabase.auth.onAuthStateChange] ${authStateChangeTime} - Auth state change event: ${event}`);
      console.log(`[supabase.auth.onAuthStateChange] ${authStateChangeTime} - Session:`, session);
      
      setSupabaseSession(session);
      
      if (session?.user) {
        console.log(`[supabase.auth.onAuthStateChange] ${Date.now()} - Session user found, fetching profile`);
        await fetchProfileAndSet(session.user.id);
      } else {
        console.log(`[supabase.auth.onAuthStateChange] ${Date.now()} - No session user, setting currentUser to null`);
        setCurrentUser(null);
      }
      
      console.log(`[supabase.auth.onAuthStateChange] ${Date.now()} - Auth state change processing completed (total time: ${Date.now() - authStateChangeTime}ms)`);
    });
    
    if (isMounted) {
      initializeAuth();
    }
    
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [initializeAuth]);

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

  // Memoize computed values to prevent unnecessary re-renders
  const value = useMemo(() => ({
    currentUser,
    isLoggedIn: !!supabaseSession || !!currentUser,
    authReady: !isLoading,
    isLoading,
    error,
    retryAuth,
    login,
    logout,
    updateUser,
    loginOrSignup,
    loginAsGuest,
    convertGuestToUser
  }), [currentUser, supabaseSession, isLoading, error, retryAuth, login, logout, updateUser, loginOrSignup, loginAsGuest, convertGuestToUser]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
