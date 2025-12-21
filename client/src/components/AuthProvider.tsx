import { createContext, useContext, useEffect, useState } from "react";
import { getOrCreateAppUserId } from "@/services/appUserService";
import type { Language } from "@shared/schema";

interface AuthContextType {
  appUserId: string;
  loading: boolean;
  userPreferredLanguage: Language;
  updatePreferredLanguage: (language: Language) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PREFERRED_LANGUAGE_KEY = 'preferred_language';

function getStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(PREFERRED_LANGUAGE_KEY);
    if (stored === 'ar' || stored === 'fr' || stored === 'dz') {
      return stored;
    }
  } catch (error) {
    console.error('Error reading preferred language:', error);
  }
  return 'ar';
}

function storeLanguage(language: Language): void {
  try {
    localStorage.setItem(PREFERRED_LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error storing preferred language:', error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [appUserId, setAppUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [userPreferredLanguage, setUserPreferredLanguage] = useState<Language>('ar');

  useEffect(() => {
    initializeAppUser();
  }, []);

  const initializeAppUser = () => {
    try {
      const userId = getOrCreateAppUserId();
      setAppUserId(userId);
      
      const storedLanguage = getStoredLanguage();
      setUserPreferredLanguage(storedLanguage);
      
      setLoading(false);
    } catch (error) {
      console.error('Error initializing app user:', error);
      setLoading(false);
    }
  };

  const updatePreferredLanguage = (language: Language) => {
    storeLanguage(language);
    setUserPreferredLanguage(language);
  };

  const value = {
    appUserId,
    loading,
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
