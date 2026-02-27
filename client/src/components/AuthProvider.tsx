import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User, Session } from "@supabase/supabase-js";
import type { Language } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  appUserId: string;
  userPreferredLanguage: Language;
  updatePreferredLanguage: (language: Language) => void;
  signOut: () => Promise<void>;
  showAuthModal: (tab?: 'login' | 'signup') => void;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup';
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PREFERRED_LANGUAGE_KEY = 'preferred_language';

function getStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(PREFERRED_LANGUAGE_KEY);
    if (stored === 'ar' || stored === 'fr' || stored === 'dz') return stored;
  } catch { }
  return 'ar';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPreferredLanguage, setUserPreferredLanguage] = useState<Language>('ar');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('signup');

  useEffect(() => {
    setUserPreferredLanguage(getStoredLanguage());

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const showAuthModal = useCallback((tab: 'login' | 'signup' = 'signup') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const updatePreferredLanguage = useCallback((language: Language) => {
    try { localStorage.setItem(PREFERRED_LANGUAGE_KEY, language); } catch { }
    setUserPreferredLanguage(language);
  }, []);

  const value: AuthContextType = {
    user,
    session,
    isAuthenticated: !!user,
    loading,
    appUserId: user?.id ?? '',
    userPreferredLanguage,
    updatePreferredLanguage,
    signOut,
    showAuthModal,
    isAuthModalOpen,
    authModalTab,
    closeAuthModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
