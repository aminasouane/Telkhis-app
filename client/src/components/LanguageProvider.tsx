import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Language } from "@shared/schema";

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  setLanguageFromExternal: (lang: Language) => void; // called by AuthProvider after login
  direction: "rtl" | "ltr";
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("language");
    return (stored as Language) || "ar";
  });

  const direction: "rtl" | "ltr" = "rtl";

  useEffect(() => {
    const root = document.documentElement;
    root.dir = "rtl";
    root.lang = "ar";
    localStorage.setItem("language", language);
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    // Persisting to Supabase happens via AuthProvider/settings API
  }, []);

  // Called by AuthProvider after loading user settings from Supabase
  const setLanguageFromExternal = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, setLanguageFromExternal, direction }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
