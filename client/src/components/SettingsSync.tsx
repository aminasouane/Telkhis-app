/**
 * SettingsSync — مكوّن يعيش داخل كل الـ providers
 * يزامن إعدادات المستخدم (الثيم واللغة) مع Supabase بعد تسجيل الدخول
 * يجب وضعه داخل <LanguageProvider> في App.tsx
 */
import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { useLanguage } from "@/components/LanguageProvider";
import type { Language } from "@shared/schema";

export function SettingsSync() {
    const { session, appUserId, isAuthenticated } = useAuth();
    const { setThemeFromExternal } = useTheme();
    const { setLanguageFromExternal } = useLanguage();

    useEffect(() => {
        if (!isAuthenticated || !appUserId || !session?.access_token) return;

        // Load settings from Supabase and apply theme + language
        fetch(`/api/user/settings?userId=${appUserId}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
        })
            .then((r) => r.json())
            .then((data) => {
                const s = data?.settings;
                if (s?.theme === "light" || s?.theme === "dark") {
                    setThemeFromExternal(s.theme);
                }
                if (s?.preferred_language) {
                    setLanguageFromExternal(s.preferred_language as Language);
                }
            })
            .catch(() => { });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, appUserId]);

    return null; // This component renders nothing
}
