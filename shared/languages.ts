export interface Language {
  code: string;
  name: string;
  nativeName: string;
  direction: 'rtl' | 'ltr';
}

export const SUPPORTED_LANGUAGES: Language[] = [
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl'
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr'
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr'
  },
  {
    code: 'dz',
    name: 'Algerian Dialect',
    nativeName: 'الدارجة الجزائرية',
    direction: 'rtl'
  }
];

export const DEFAULT_LANGUAGE = 'ar';

export function getLanguageByCode(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
}

export function getDirection(code: string): 'rtl' | 'ltr' {
  const lang = getLanguageByCode(code);
  return lang?.direction || 'rtl';
}

export function isRTL(code: string): boolean {
  return getDirection(code) === 'rtl';
}

export type TranslationKey = 
  | 'appName'
  | 'welcome'
  | 'welcomeMessage'
  | 'selectLanguage'
  | 'startUsing'
  | 'noLoginRequired'
  | 'dataStoredLocally';

export type Translations = Record<TranslationKey, string>;

export const translations: Record<string, Translations> = {
  ar: {
    appName: 'تلخيصلي',
    welcome: 'مرحباً بك في تلخيصلي',
    welcomeMessage: 'تلخيص ذكي للمحاضرات والتسجيلات الصوتية',
    selectLanguage: 'اختر لغتك المفضلة',
    startUsing: 'ابدأ الاستخدام',
    noLoginRequired: 'يمكنك استخدام التطبيق مباشرة بدون تسجيل دخول',
    dataStoredLocally: 'سيتم حفظ بياناتك تلقائياً على جهازك'
  },
  fr: {
    appName: 'Takhleesly',
    welcome: 'Bienvenue sur Takhleesly',
    welcomeMessage: 'Résumé intelligent de cours et d\'enregistrements audio',
    selectLanguage: 'Choisissez votre langue',
    startUsing: 'Commencer',
    noLoginRequired: 'Vous pouvez utiliser l\'application sans inscription',
    dataStoredLocally: 'Vos données seront sauvegardées localement'
  },
  en: {
    appName: 'Takhleesly',
    welcome: 'Welcome to Takhleesly',
    welcomeMessage: 'Smart transcription and summarization for lectures and audio recordings',
    selectLanguage: 'Select your language',
    startUsing: 'Get Started',
    noLoginRequired: 'You can use the app without signing up',
    dataStoredLocally: 'Your data will be saved locally on your device'
  },
  dz: {
    appName: 'تلخيصلي',
    welcome: 'مرحبا بيك في تلخيصلي',
    welcomeMessage: 'تلخيص ذكي للدروس والتسجيلات الصوتية',
    selectLanguage: 'اختار اللغة لي تحبها',
    startUsing: 'ابدا الاستخدام',
    noLoginRequired: 'تقدر تستعمل التطبيق بلا ما تسجل',
    dataStoredLocally: 'البيانات تاعك راح تتحفظ تلقائياً في جهازك'
  }
};

export function getTranslation(langCode: string, key: TranslationKey): string {
  return translations[langCode]?.[key] || translations['ar'][key];
}
