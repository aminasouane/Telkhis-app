import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Globe, ArrowLeft, ArrowRight } from "lucide-react";
import { 
  SUPPORTED_LANGUAGES, 
  DEFAULT_LANGUAGE, 
  getTranslation, 
  getDirection,
  type Language 
} from "@shared/languages";

const LANGUAGE_STORAGE_KEY = 'takhleesly_language';

export default function Login() {
  const [, navigate] = useLocation();
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LANGUAGE_STORAGE_KEY) || DEFAULT_LANGUAGE;
    }
    return DEFAULT_LANGUAGE;
  });

  const direction = getDirection(selectedLanguage);
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(selectedLanguage, key);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, selectedLanguage);
  }, [selectedLanguage]);

  const handleStart = () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, selectedLanguage);
    navigate("/");
  };

  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4" 
      dir={direction}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary" data-testid="text-app-name">
            {t('appName')}
          </CardTitle>
          <CardDescription className="text-lg" data-testid="text-welcome">
            {t('welcome')}
          </CardDescription>
          <p className="text-sm text-muted-foreground" data-testid="text-welcome-message">
            {t('welcomeMessage')}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              {t('selectLanguage')}
            </Label>
            
            <RadioGroup 
              value={selectedLanguage} 
              onValueChange={setSelectedLanguage}
              className="grid gap-2"
            >
              {SUPPORTED_LANGUAGES.map((lang: Language) => (
                <div 
                  key={lang.code}
                  className={`flex items-center space-x-3 space-x-reverse rounded-lg border p-3 cursor-pointer transition-colors hover-elevate ${
                    selectedLanguage === lang.code 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border'
                  }`}
                  onClick={() => setSelectedLanguage(lang.code)}
                  data-testid={`radio-language-${lang.code}`}
                >
                  <RadioGroupItem value={lang.code} id={lang.code} />
                  <Label 
                    htmlFor={lang.code} 
                    className="flex-1 cursor-pointer flex justify-between items-center"
                  >
                    <span className="font-medium">{lang.nativeName}</span>
                    <span className="text-xs text-muted-foreground">{lang.name}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="text-center space-y-2 text-sm text-muted-foreground">
            <p>{t('noLoginRequired')}</p>
            <p>{t('dataStoredLocally')}</p>
          </div>

          <Button
            onClick={handleStart}
            className="w-full gap-2"
            size="lg"
            data-testid="button-start"
          >
            {t('startUsing')}
            <ArrowIcon className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
