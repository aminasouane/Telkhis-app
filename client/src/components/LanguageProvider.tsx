import { createContext, useContext, useEffect, useState } from "react";
import { Language } from "@shared/schema";

type LanguageContextType = {
  language: Language;  // This is the SUMMARY language, not UI language
  setLanguage: (language: Language) => void;
  direction: "rtl" | "ltr";  // Always "rtl" since UI is always Arabic
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Summary language - only affects output, not UI
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("language");
    return (stored as Language) || "ar";
  });

  // UI is ALWAYS in Arabic (RTL) - language selection only affects summary output
  const direction: "rtl" | "ltr" = "rtl";

  useEffect(() => {
    const root = document.documentElement;
    root.dir = "rtl";  // Always RTL for Arabic UI
    root.lang = "ar";  // Always Arabic for UI
    localStorage.setItem("language", language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, direction }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
