import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, Session } from "@supabase/supabase-js";
import { upsertUser, getUserSettings, updateUserSettings } from "@/services/dbService";
import { createGuestSession, migrateGuestToUser, getDeviceId } from "@/services/trialService";
import type { Language } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  guestUserId: string | null;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  userPreferredLanguage: Language | null;
  updatePreferredLanguage: (language: Language) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [userPreferredLanguage, setUserPreferredLanguage] = useState<Language | null>(null);

  useEffect(() => {
    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsGuest(false);
        
        // If there was a guest user, migrate their data
        if (guestUserId) {
          await migrateGuestToUser(guestUserId, session.user.id);
          setGuestUserId(null);
        }
        
        await initializeUser(session.user);
      } else {
        // User signed out, create guest session
        await initializeGuestSession();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const initializeAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setIsGuest(false);
        await initializeUser(session.user);
      } else {
        // No authenticated user, create or get guest session
        await initializeGuestSession();
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error initializing auth:', error);
      setLoading(false);
    }
  };

  const initializeGuestSession = async () => {
    try {
      // Create or retrieve guest session via backend API
      const guestSession = await createGuestSession();
      
      if (guestSession) {
        setIsGuest(true);
        setGuestUserId(guestSession.userId);
        setUserPreferredLanguage('ar'); // Default language for guests
      }
    } catch (error) {
      console.error('Error initializing guest session:', error);
    }
  };

  const initializeUser = async (user: User) => {
    // Upsert user in database
    await upsertUser(user.id, user.email!, user.user_metadata?.name);
    
    // Get user settings
    const settings = await getUserSettings(user.id);
    if (settings) {
      setUserPreferredLanguage(settings.preferred_language);
    } else {
      // Create default settings
      await updateUserSettings({
        user_id: user.id,
        preferred_language: 'ar',
        notifications_enabled: true
      });
      setUserPreferredLanguage('ar');
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
        },
      },
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserPreferredLanguage(null);
  };

  const updatePreferredLanguage = async (language: Language) => {
    if (!user) return;
    
    await updateUserSettings({
      user_id: user.id,
      preferred_language: language,
      notifications_enabled: true
    });
    
    setUserPreferredLanguage(language);
  };

  const value = {
    user,
    session,
    loading,
    isGuest,
    guestUserId,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    userPreferredLanguage,
    updatePreferredLanguage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
