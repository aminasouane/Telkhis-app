import { createContext, useContext, useEffect, useState } from "react";
import { Language } from "@shared/schema";

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  direction: "rtl" | "ltr";
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("language");
    return (stored as Language) || "ar";
  });

  const direction = language === "fr" ? "ltr" : "rtl";

  useEffect(() => {
    const root = document.documentElement;
    root.dir = direction;
    root.lang = language === "dz" ? "ar-DZ" : language;
    localStorage.setItem("language", language);
  }, [language, direction]);

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
